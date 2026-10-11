/* Página: perfil.html (somente clientes logados) */

const usuario = Sessao.exigir('cliente');

const nomesStatus = {
  pendente: 'Pendente',
  parcial: 'Pago parcial',
  pago: 'Pago',
  cancelada: 'Cancelada'
};


function desenharPerfil() {
  const reservas = Reservas.listarDoUsuario(usuario.id).reverse();

  let totalGeral = 0;
  let totalPago = 0;

  reservas.forEach(function (r) {
    if (r.cancelada) return;
    totalGeral += r.total;
    totalPago += Reservas.totalPago(r);
  });

  const faltaGeral = arredondar(totalGeral - totalPago);

  document.getElementById('resumo').innerHTML =
    '<div class="item"><span>Total em compras</span><strong>' + formatarMoeda(totalGeral) + '</strong></div>' +
    '<div class="item pago"><span>Já pago</span><strong>' + formatarMoeda(totalPago) + '</strong></div>' +
    '<div class="item falta"><span>Falta pagar</span><strong>' + formatarMoeda(faltaGeral) + '</strong></div>';

  const tabela = document.getElementById('tabela');

  if (reservas.length === 0) {
    tabela.innerHTML = '<tr><td colspan="7" class="vazio">Você ainda não reservou nenhum produto.</td></tr>';
    return;
  }

  let html = '';

  reservas.forEach(function (r) {
    const status = Reservas.status(r);
    const pago = Reservas.totalPago(r);
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

    html +=
      '<tr>' +
        '<td><strong>' + esc(r.produtoNome) + '</strong><br>' +
          '<small>' + formatarMoeda(r.precoUnitario) + ' cada</small>' +
          (r.aguardandoReposicao && !r.cancelada
            ? '<br><small class="atrasado">Item agendado para reposição</small>' : '') + '</td>' +
        '<td>' + r.quantidade + '</td>' +
        '<td>' + formatarMoeda(r.total) + '</td>' +
        '<td>' + formatarMoeda(pago) +
          '<div class="barra"><div style="width:' + percentual + '%"></div></div>' +
          historico + '</td>' +
        '<td>' + formatarMoeda(Reservas.falta(r)) + '</td>' +
        '<td class="' + (atrasado ? 'atrasado' : '') + '">' + formatarData(r.dataPagamento) +
          (atrasado ? '<br>Atrasado' : '') + '</td>' +
        '<td><span class="tag ' + status + '">' + nomesStatus[status] + '</span></td>' +
      '</tr>';
  });

  tabela.innerHTML = html;
}

desenharPerfil();
