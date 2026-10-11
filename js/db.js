/* ==========================================================
   BANCO LOCAL (localStorage)
   Tabelas: usuarios, produtos, reservas
   Os dados ficam salvos no navegador do computador.
   ========================================================== */

const DB = {

  prefixo: 'lojaReserva_',

  // Lê uma tabela inteira (retorna lista)
  ler(tabela) {
    try {
      return JSON.parse(localStorage.getItem(this.prefixo + tabela)) || [];
    } catch (erro) {
      return [];
    }
  },

  // Salva uma tabela inteira
  salvar(tabela, dados) {
    localStorage.setItem(this.prefixo + tabela, JSON.stringify(dados));
  },

  // Gera um id único
  novoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
};


/* ---------- Funções auxiliares ---------- */

// Hash simples da senha (não guarda a senha em texto puro).
// Obs.: em projeto real use um servidor com bcrypt.
function hashSenha(texto) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function arredondar(valor) {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

function formatarMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataISO) {
  if (!dataISO) return '-';
  const partes = dataISO.slice(0, 10).split('-');
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// Evita injeção de HTML ao mostrar textos digitados pelo usuário
function esc(texto) {
  const div = document.createElement('div');
  div.textContent = texto == null ? '' : String(texto);
  return div.innerHTML;
}

function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = 'msg mostrar ' + tipo;
}


/* ---------- Usuários ---------- */

const Usuarios = {

  // Cria o administrador padrão na primeira vez
  iniciar() {
    const lista = DB.ler('usuarios');
    if (lista.length === 0) {
      lista.push({
        id: DB.novoId(),
        nome: 'Administrador',
        usuario: 'admin',
        senha: hashSenha('admin123'),
        telefone: '',
        perfil: 'admin'
      });
      DB.salvar('usuarios', lista);
    }
  },

  buscarPorLogin(usuario) {
    return DB.ler('usuarios').find(u => u.usuario.toLowerCase() === usuario.toLowerCase());
  },

  buscarPorId(id) {
    return DB.ler('usuarios').find(u => u.id === id);
  },

  cadastrar(nome, usuario, senha, telefone) {
    if (this.buscarPorLogin(usuario)) {
      return { ok: false, msg: 'Este usuário já existe. Escolha outro.' };
    }

    const lista = DB.ler('usuarios');
    lista.push({
      id: DB.novoId(),
      nome: nome,
      usuario: usuario,
      senha: hashSenha(senha),
      telefone: telefone,
      perfil: 'cliente'
    });
    DB.salvar('usuarios', lista);

    return { ok: true };
  },

  autenticar(usuario, senha) {
    const u = this.buscarPorLogin(usuario);
    if (!u || u.senha !== hashSenha(senha)) return null;
    return u;
  }
};


/* ---------- Produtos ---------- */

const Produtos = {

  listar() {
    return DB.ler('produtos');
  },

  buscar(id) {
    return this.listar().find(p => p.id === id);
  },

  salvar(produto) {
    const lista = this.listar();
    const posicao = lista.findIndex(p => p.id === produto.id);

    if (posicao >= 0) {
      lista[posicao] = produto;
    } else {
      lista.push(produto);
    }

    DB.salvar('produtos', lista);
  },

  excluir(id) {
    DB.salvar('produtos', this.listar().filter(p => p.id !== id));
  }
};


/* ---------- Reservas e pagamentos ---------- */

const Reservas = {

  listar() {
    return DB.ler('reservas');
  },

  listarDoUsuario(usuarioId) {
    return this.listar().filter(r => r.usuarioId === usuarioId);
  },

  totalPago(reserva) {
    const soma = reserva.pagamentos.reduce((total, p) => total + p.valor, 0);
    return arredondar(soma);
  },

  falta(reserva) {
    if (reserva.cancelada) return 0;
    return arredondar(reserva.total - this.totalPago(reserva));
  },

  // retorna: 'pendente', 'parcial', 'pago' ou 'cancelada'
  status(reserva) {
    if (reserva.cancelada) return 'cancelada';
    const pago = this.totalPago(reserva);
    if (pago >= reserva.total) return 'pago';
    if (pago > 0) return 'parcial';
    return 'pendente';
  },

  // Cria uma reserva e desconta do estoque
  criar(usuario, produtoId, quantidade, dataPagamento) {
    const produto = Produtos.buscar(produtoId);

    if (!produto) return { ok: false, msg: 'Produto não encontrado.' };
    if (quantidade < 1) return { ok: false, msg: 'Informe uma quantidade válida.' };

    // Estoque zerado: o pedido é aceito e fica aguardando reposição
    const semEstoque = produto.estoque === 0;

    if (!semEstoque && quantidade > produto.estoque) {
      return { ok: false, msg: 'Só temos ' + produto.estoque + ' unidade(s) em estoque.' };
    }
    if (!dataPagamento) return { ok: false, msg: 'Informe a data de pagamento.' };

    // Só desconta do estoque quando há estoque (nunca fica negativo)
    if (!semEstoque) {
      produto.estoque -= quantidade;
      Produtos.salvar(produto);
    }

    const lista = this.listar();
    lista.push({
      id: DB.novoId(),
      usuarioId: usuario.id,
      produtoId: produto.id,
      produtoNome: produto.nome,
      precoUnitario: produto.preco,
      quantidade: quantidade,
      total: arredondar(produto.preco * quantidade),
      dataPagamento: dataPagamento,
      criadoEm: hojeISO(),
      pagamentos: [],
      cancelada: false,
      aguardandoReposicao: semEstoque,
      qtdDoEstoque: semEstoque ? 0 : quantidade
    });
    DB.salvar('reservas', lista);

    return { ok: true };
  },

  // Baixa (total ou parcial): registra um pagamento
  darBaixa(reservaId, valor) {
    const lista = this.listar();
    const reserva = lista.find(r => r.id === reservaId);

    if (!reserva) return { ok: false, msg: 'Reserva não encontrada.' };

    valor = arredondar(valor);
    const falta = this.falta(reserva);

    if (!(valor > 0)) return { ok: false, msg: 'Informe um valor maior que zero.' };
    if (valor > falta) {
      return { ok: false, msg: 'O valor é maior que o que falta pagar (' + formatarMoeda(falta) + ').' };
    }

    reserva.pagamentos.push({ valor: valor, data: hojeISO() });
    DB.salvar('reservas', lista);

    return { ok: true };
  },

  // Exclui a reserva (apaga o registro).
  // Se ainda não estava paga por completo, devolve ao estoque
  // só o que foi descontado dele quando a reserva foi feita.
  excluir(reservaId) {
    const lista = this.listar();
    const reserva = lista.find(r => r.id === reservaId);

    if (!reserva) return;

    const devolveEstoque = !reserva.cancelada && this.status(reserva) !== 'pago';

    if (devolveEstoque) {
      const devolver = reserva.qtdDoEstoque !== undefined ? reserva.qtdDoEstoque : reserva.quantidade;
      const produto = Produtos.buscar(reserva.produtoId);

      if (produto && devolver > 0) {
        produto.estoque += devolver;
        Produtos.salvar(produto);
      }
    }

    DB.salvar('reservas', lista.filter(r => r.id !== reservaId));
  },

  // Admin avisa que o item chegou (some o aviso de reposição)
  marcarReposicaoChegou(reservaId) {
    const lista = this.listar();
    const reserva = lista.find(r => r.id === reservaId);

    if (!reserva) return;

    reserva.aguardandoReposicao = false;
    DB.salvar('reservas', lista);
  }
};

Usuarios.iniciar();
