/* Página: loja.html (somente clientes logados) */

const usuario = Sessao.exigir('cliente');

const vitrine = document.getElementById('vitrine');
const msg = document.getElementById('msg');


function desenharProdutos() {
  const texto = document.getElementById('busca').value.toLowerCase();
  const categoria = document.getElementById('filtro-categoria').value;

  const lista = Produtos.listar().filter(function (p) {
    const nomeOk = p.nome.toLowerCase().includes(texto);
    const categoriaOk = !categoria || p.categoria === categoria;
    return nomeOk && categoriaOk;
  });

  if (lista.length === 0) {
    vitrine.innerHTML = '<p class="vazio">Nenhum produto encontrado.</p>';
    return;
  }

  let html = '';

  lista.forEach(function (p) {
    const foto = p.imagem
      ? '<img src="' + p.imagem + '" alt="' + esc(p.nome) + '">'
      : 'Sem foto';

    let classeEstoque = '';
    let textoEstoque = 'Em estoque: ' + p.estoque;

    if (p.estoque === 0) {
      classeEstoque = 'acabando';
      textoEstoque = 'Este item está agendado para reposição';
    } else if (p.estoque <= 3) {
      classeEstoque = 'acabando';
      textoEstoque = 'Últimas ' + p.estoque + ' unidade(s)';
    }

    // Com estoque zerado o cliente ainda pode pedir (sem limite de quantidade)
    const maximo = p.estoque > 0 ? ' max="' + p.estoque + '"' : '';

    const reservar =
      '<div class="linha-dupla">' +
        '<div>' +
          '<label>Qtd.</label>' +
          '<input type="number" min="1"' + maximo + ' value="1" id="qtd-' + p.id + '">' +
        '</div>' +
        '<div>' +
          '<label>Data de pagamento</label>' +
          '<input type="date" min="' + hojeISO() + '" id="data-' + p.id + '">' +
        '</div>' +
      '</div>' +
      '<button class="btn btn-total" data-reservar="' + p.id + '">Reservar</button>';

    html +=
      '<article class="produto">' +
        '<div class="foto">' + foto + '</div>' +
        '<div class="corpo">' +
          '<span class="categoria">' + esc(p.categoria) + '</span>' +
          '<h3>' + esc(p.nome) + '</h3>' +
          '<p class="descricao">' + esc(p.descricao) + '</p>' +
          '<div class="preco">' + formatarMoeda(p.preco) + '</div>' +
          '<div class="estoque ' + classeEstoque + '">' + textoEstoque + '</div>' +
          '<div class="reservar">' + reservar + '</div>' +
        '</div>' +
      '</article>';
  });

  vitrine.innerHTML = html;
}


// Clique no botão "Reservar" de qualquer card
vitrine.addEventListener('click', function (e) {
  const id = e.target.getAttribute('data-reservar');
  if (!id) return;

  const quantidade = parseInt(document.getElementById('qtd-' + id).value, 10);
  const data = document.getElementById('data-' + id).value;

  const resultado = Reservas.criar(usuario, id, quantidade, data);

  if (!resultado.ok) {
    mostrarMensagem(msg, resultado.msg, 'erro');
    window.scrollTo(0, 0);
    return;
  }

  mostrarMensagem(msg, 'Reserva feita! Acompanhe em "Minhas compras".', 'ok');
  window.scrollTo(0, 0);
  desenharProdutos();
});

document.getElementById('busca').addEventListener('input', desenharProdutos);
document.getElementById('filtro-categoria').addEventListener('change', desenharProdutos);

desenharProdutos();
