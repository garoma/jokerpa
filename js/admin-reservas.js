/* Página: admin-reservas.html (somente administrador) */

Sessao.exigir('admin');

const tabela = document.getElementById('tabela');
const msg = document.getElementById('msg');

const nomesStatus = {
  pendente: 'Pendente',
  parcial: 'Pago parcial',
  pago: 'Pago',
  cancelada: 'Cancelada'
};


function desenharResumo(reservas) {
  let total = 0;
  let pago = 0;

  reservas.forEach(function (r) {
    if (r.cancelada) return;
    total += r.total;
    pago += Reservas.totalPago(r);
  });

  document.getElementById('resumo').innerHTML =
    '<div class="item"><span>Total reservado</span><strong>' + formatarMoeda(total) + '</strong></div>' +
    '<div class="item pago"><span>Total recebido</span><strong>' + formatarMoeda(pago) + '</strong></div>' +
    '<div class="item falta"><span>A receber</span><strong>' + formatarMoeda(arredondar(total - pago)) + '</strong></div>';
}


function desenharTabela() {
  const todas = Reservas.listar();
  desenharResumo(todas);

  const texto = document.getElementById('busca').value.toLowerCase();
  const filtroStatus = document.getElementById('filtro-status').value;

  const lista = todas.slice().reverse().filter(function (r) {
    const cliente = Usuarios.buscarPorId(r.usuarioId);
    const nomeCliente = cliente ? cliente.nome.toLowerCase() : '';
    const buscaOk = nomeCliente.includes(texto) || r.produtoNome.toLowerCase().includes(texto);
    const statusOk = !filtroStatus || Reservas.status(r) === filtroStatus;
    return buscaOk && statusOk;
  });

  if (lista.length === 0) {
    tabela.innerHTML = '<tr><td colspan="9" class="vazio">Nenhuma reserva encontrada.</td></tr>';
    return;
  }

  let html = '';

  lista.forEach(function (r) {
    const cliente = Usuarios.buscarPorId(r.usuarioId);
    const status = Reservas.status(r);
    const pago = Reservas.totalPago(r);
    const falta = Reservas.falta(r);
    const percentual = Math.min(100, Math.round((pago / r.total) * 100));
    const atrasado = status !== 'pago' && status !== 'cancelada' && r.dataPagamento < hojeISO();

    let historico = '';
    if (r.pagamentos.length > 0) {
      historico = '<ul class="historico">';
      r.pagamentos.forEach(function (p) {
        historico += '<li>' + formatarMoeda(p.valor) + ' em ' + formatarData(p.data) + '</li>';
      });
      historico += '</ul>';
    }

    let baixa = '-';

    if (status === 'pendente' || status === 'parcial') {
      baixa =
        '<div class="acoes">' +
          '<input type="number" step="0.01" min="0.01" max="' + falta + '" placeholder="Valor" ' +
                 'style="width:100px;" id="valor-' + r.id + '">' +
          '<button class="btn btn-pequeno btn-verde" data-parcial="' + r.id + '">Baixa parcial</button>' +
        '</div>' +
        '<div class="acoes" style="margin-top:6px;">' +
          '<button class="btn btn-pequeno" data-total="' + r.id + '">Baixa total (' + formatarMoeda(falta) + ')</button>' +
        '</div>';
    }

    if (r.aguardandoReposicao && !r.cancelada) {
      baixa += '<div class="acoes" style="margin-top:6px;">' +
        '<button class="btn btn-pequeno btn-claro" data-chegou="' + r.id + '">Reposição chegou</button>' +
      '</div>';
    }

    // Botão Excluir aparece em todas as reservas
    if (baixa === '-') baixa = '';

    baixa += '<div class="acoes" style="margin-top:6px;">' +
      '<button class="btn btn-pequeno btn-vermelho" data-excluir="' + r.id + '">Excluir</button>' +
    '</div>';

    html +=
      '<tr>' +
        '<td><strong>' + esc(cliente ? cliente.nome : 'Removido') + '</strong><br>' +
          '<small>' + esc(cliente ? cliente.telefone : '') + '</small></td>' +
        '<td>' + esc(r.produtoNome) +
          (r.aguardandoReposicao && !r.cancelada
            ? '<br><small class="atrasado">Aguardando reposição</small>' : '') + '</td>' +
        '<td>' + r.quantidade + '</td>' +
        '<td>' + formatarMoeda(r.total) + '</td>' +
        '<td>' + formatarMoeda(pago) +
          '<div class="barra"><div style="width:' + percentual + '%"></div></div>' + historico + '</td>' +
        '<td>' + formatarMoeda(falta) + '</td>' +
        '<td class="' + (atrasado ? 'atrasado' : '') + '">' + formatarData(r.dataPagamento) +
          (atrasado ? '<br>Atrasado' : '') + '</td>' +
        '<td><span class="tag ' + status + '">' + nomesStatus[status] + '</span></td>' +
        '<td>' + baixa + '</td>' +
      '</tr>';
  });

  tabela.innerHTML = html;
}


function mostrarResultado(resultado, textoOk) {
  if (resultado.ok) {
    mostrarMensagem(msg, textoOk, 'ok');
  } else {
    mostrarMensagem(msg, resultado.msg, 'erro');
  }
  desenharTabela();
}


tabela.addEventListener('click', function (e) {
  const idParcial = e.target.getAttribute('data-parcial');
  const idTotal = e.target.getAttribute('data-total');
  const idExcluir = e.target.getAttribute('data-excluir');
  const idChegou = e.target.getAttribute('data-chegou');

  // Item reposto: tira o aviso de reposição da reserva
  if (idChegou) {
    Reservas.marcarReposicaoChegou(idChegou);
    mostrarMensagem(msg, 'Reposição marcada como recebida.', 'ok');
    desenharTabela();
  }

  // Baixa parcial: usa o valor digitado
  if (idParcial) {
    const valor = parseFloat(document.getElementById('valor-' + idParcial).value);
    mostrarResultado(Reservas.darBaixa(idParcial, valor), 'Baixa parcial registrada.');
  }

  // Baixa total: paga tudo que falta
  if (idTotal) {
    const reserva = Reservas.listar().find(function (r) { return r.id === idTotal; });
    mostrarResultado(Reservas.darBaixa(idTotal, Reservas.falta(reserva)), 'Baixa total registrada.');
  }

  // Excluir: apaga o registro da reserva
  if (idExcluir) {
    const reserva = Reservas.listar().find(function (r) { return r.id === idExcluir; });
    const paga = Reservas.status(reserva) === 'pago';

    const aviso = paga
      ? 'Excluir este registro? A reserva já está paga, então o estoque não será alterado.'
      : 'Excluir este registro? Os itens voltam para o estoque.';

    if (confirm(aviso)) {
      Reservas.excluir(idExcluir);
      mostrarMensagem(msg, 'Registro excluído.', 'ok');
      desenharTabela();
    }
  }
});

document.getElementById('busca').addEventListener('input', desenharTabela);
document.getElementById('filtro-status').addEventListener('change', desenharTabela);

desenharTabela();
