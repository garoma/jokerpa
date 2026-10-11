/* ==========================================================
   BACKUP E RESTAURAÇÃO EM ARQUIVO CSV
   O arquivo guarda as 3 tabelas (usuarios, produtos, reservas)
   em seções separadas, cada uma com seu cabeçalho:

     #usuarios
     id,nome,usuario,...
     ...
     #produtos
     id,nome,categoria,...
   ========================================================== */

const Backup = {

  // Campos de cada tabela e o tipo de cada um:
  // 'texto', 'numero', 'booleano' ou 'json'
  tabelas: {
    usuarios: [
      ['id', 'texto'],
      ['nome', 'texto'],
      ['usuario', 'texto'],
      ['senha', 'texto'],
      ['telefone', 'texto'],
      ['perfil', 'texto']
    ],
    produtos: [
      ['id', 'texto'],
      ['nome', 'texto'],
      ['categoria', 'texto'],
      ['preco', 'numero'],
      ['estoque', 'numero'],
      ['descricao', 'texto'],
      ['imagem', 'texto']
    ],
    reservas: [
      ['id', 'texto'],
      ['usuarioId', 'texto'],
      ['produtoId', 'texto'],
      ['produtoNome', 'texto'],
      ['precoUnitario', 'numero'],
      ['quantidade', 'numero'],
      ['total', 'numero'],
      ['dataPagamento', 'texto'],
      ['criadoEm', 'texto'],
      ['pagamentos', 'json'],
      ['cancelada', 'booleano'],
      ['aguardandoReposicao', 'booleano'],
      ['qtdDoEstoque', 'numero']
    ]
  },


  /* ---------- GERAR O ARQUIVO ---------- */

  escapar(texto) {
    if (/[",\n\r]/.test(texto)) {
      return '"' + texto.replace(/"/g, '""') + '"';
    }
    return texto;
  },

  valorParaTexto(valor, tipo) {
    if (valor === undefined || valor === null) return '';
    if (tipo === 'json') return JSON.stringify(valor);
    return String(valor);
  },

  gerarCSV() {
    const linhas = [];

    linhas.push('#BACKUP Loja Reserva,versao 1,' + new Date().toISOString());

    Object.keys(this.tabelas).forEach((nome) => {
      const campos = this.tabelas[nome];

      linhas.push('');
      linhas.push('#' + nome);
      linhas.push(campos.map(c => c[0]).join(','));

      DB.ler(nome).forEach((registro) => {
        const celulas = campos.map((c) => {
          return this.escapar(this.valorParaTexto(registro[c[0]], c[1]));
        });
        linhas.push(celulas.join(','));
      });
    });

    return linhas.join('\r\n') + '\r\n';
  },


  /* ---------- LER O ARQUIVO ---------- */

  // Lê CSV completo (aceita aspas, vírgulas e quebras de linha dentro do campo)
  lerCSV(texto) {
    if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);

    const linhas = [];
    let linha = [];
    let campo = '';
    let dentroAspas = false;

    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];

      if (dentroAspas) {
        if (c === '"') {
          if (texto[i + 1] === '"') {
            campo += '"';
            i++;
          } else {
            dentroAspas = false;
          }
        } else {
          campo += c;
        }
      } else if (c === '"') {
        dentroAspas = true;
      } else if (c === ',') {
        linha.push(campo);
        campo = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        linha.push(campo);
        linhas.push(linha);
        linha = [];
        campo = '';
      } else {
        campo += c;
      }
    }

    if (campo !== '' || linha.length > 0) {
      linha.push(campo);
      linhas.push(linha);
    }

    return linhas;
  },

  textoParaValor(texto, tipo, nomeCampo, nomeTabela) {
    if (tipo === 'numero') {
      if (texto === '') return undefined;
      const n = Number(texto);
      if (isNaN(n)) {
        throw new Error('Valor inválido "' + texto + '" no campo ' + nomeCampo + ' (' + nomeTabela + ').');
      }
      return n;
    }

    if (tipo === 'booleano') return texto === 'true';

    if (tipo === 'json') {
      if (texto === '') return [];
      try {
        return JSON.parse(texto);
      } catch (erro) {
        throw new Error('Campo ' + nomeCampo + ' (' + nomeTabela + ') está corrompido.');
      }
    }

    return texto;
  },

  // Converte o texto do CSV em { usuarios: [...], produtos: [...], reservas: [...] }
  // Se algo estiver errado, lança um erro ANTES de mexer no banco.
  interpretar(texto) {
    const linhas = this.lerCSV(texto);
    const dados = {};
    let tabelaAtual = null;
    let cabecalho = null;

    linhas.forEach((linha) => {
      const primeiro = linha[0] || '';

      if (linha.length === 1 && primeiro === '') return;   // linha em branco

      if (primeiro.charAt(0) === '#') {
        const nome = primeiro.slice(1).trim();

        if (this.tabelas[nome]) {
          tabelaAtual = nome;
          cabecalho = null;
          dados[nome] = [];
        } else {
          tabelaAtual = null;
        }
        return;
      }

      if (!tabelaAtual) return;

      if (!cabecalho) {
        cabecalho = linha.map(c => c.trim());
        return;
      }

      const registro = {};

      this.tabelas[tabelaAtual].forEach((campo) => {
        const nomeCampo = campo[0];
        const posicao = cabecalho.indexOf(nomeCampo);
        const bruto = (posicao >= 0 && linha[posicao] !== undefined) ? linha[posicao] : '';
        const valor = this.textoParaValor(bruto, campo[1], nomeCampo, tabelaAtual);

        if (valor !== undefined) registro[nomeCampo] = valor;
      });

      if (!registro.id) {
        throw new Error('Há um registro sem id na tabela ' + tabelaAtual + '.');
      }

      dados[tabelaAtual].push(registro);
    });

    Object.keys(this.tabelas).forEach((nome) => {
      if (!dados[nome]) {
        throw new Error('Este arquivo não é um backup válido: falta a seção "' + nome + '".');
      }
    });

    if (!dados.usuarios.some(u => u.perfil === 'admin')) {
      throw new Error('O backup não tem nenhum administrador. Restauração cancelada.');
    }

    return dados;
  },

  // Substitui TODOS os dados atuais pelos do arquivo
  restaurar(texto) {
    const dados = this.interpretar(texto);

    Object.keys(dados).forEach((nome) => {
      DB.salvar(nome, dados[nome]);
    });

    return {
      usuarios: dados.usuarios.length,
      produtos: dados.produtos.length,
      reservas: dados.reservas.length
    };
  }
};
