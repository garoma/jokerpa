/* Página: admin-produtos.html (somente administrador) */

Sessao.exigir('admin');

const form = document.getElementById('form-produto');
const msg = document.getElementById('msg');
const tabela = document.getElementById('tabela');

let imagemAtual = '';   // foto em base64 do produto que está sendo editado


// Reduz a foto para no máximo 500px (para caber no banco local)
function lerImagem(arquivo, callback) {
  const leitor = new FileReader();

  leitor.onload = function () {
    const img = new Image();

    img.onload = function () {
      const escala = Math.min(1, 500 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/jpeg', 0.75));
    };

    img.src = leitor.result;
  };

  leitor.readAsDataURL(arquivo);
}


function limparFormulario() {
  form.reset();
  document.getElementById('produto-id').value = '';
  document.getElementById('titulo-form').textContent = 'Cadastrar produto';
  document.getElementById('btn-cancelar').style.display = 'none';
  imagemAtual = '';
}


function salvarProduto() {
  const id = document.getElementById('produto-id').value || DB.novoId();

  Produtos.salvar({
    id: id,
    nome: document.getElementById('nome').value.trim(),
    categoria: document.getElementById('categoria').value,
    preco: arredondar(document.getElementById('preco').value),
    estoque: parseInt(document.getElementById('estoque').value, 10),
    descricao: document.getElementById('descricao').value.trim(),
    imagem: imagemAtual
  });

  limparFormulario();
  mostrarMensagem(msg, 'Produto salvo com sucesso.', 'ok');
  desenharTabela();
}


form.addEventListener('submit', function (e) {
  e.preventDefault();

  const arquivo = document.getElementById('imagem').files[0];

  if (arquivo) {
    lerImagem(arquivo, function (base64) {
      imagemAtual = base64;
      salvarProduto();
    });
  } else {
    salvarProduto();
  }
});


document.getElementById('btn-cancelar').addEventListener('click', limparFormulario);


function desenharTabela() {
  const lista = Produtos.listar();

  if (lista.length === 0) {
    tabela.innerHTML = '<tr><td colspan="6" class="vazio">Nenhum produto cadastrado ainda.</td></tr>';
    return;
  }

  let html = '';

  lista.forEach(function (p) {
    const foto = p.imagem
      ? '<img class="miniatura" src="' + p.imagem + '" alt="">'
      : '<div class="miniatura"></div>';

    html +=
      '<tr>' +
        '<td>' + foto + '</td>' +
        '<td><strong>' + esc(p.nome) + '</strong><br><small>' + esc(p.descricao) + '</small></td>' +
        '<td>' + esc(p.categoria) + '</td>' +
        '<td>' + formatarMoeda(p.preco) + '</td>' +
        '<td>' + p.estoque + '</td>' +
        '<td><div class="acoes">' +
          '<button class="btn btn-pequeno" data-editar="' + p.id + '">Editar</button>' +
          '<button class="btn btn-pequeno btn-vermelho" data-excluir="' + p.id + '">Excluir</button>' +
        '</div></td>' +
      '</tr>';
  });

  tabela.innerHTML = html;
}


tabela.addEventListener('click', function (e) {
  const idEditar = e.target.getAttribute('data-editar');
  const idExcluir = e.target.getAttribute('data-excluir');

  if (idEditar) {
    const p = Produtos.buscar(idEditar);

    document.getElementById('produto-id').value = p.id;
    document.getElementById('nome').value = p.nome;
    document.getElementById('categoria').value = p.categoria;
    document.getElementById('preco').value = p.preco;
    document.getElementById('estoque').value = p.estoque;
    document.getElementById('descricao').value = p.descricao;
    document.getElementById('titulo-form').textContent = 'Editar produto';
    document.getElementById('btn-cancelar').style.display = 'inline-block';
    imagemAtual = p.imagem || '';

    window.scrollTo(0, 0);
  }

  if (idExcluir) {
    if (confirm('Excluir este produto? As reservas já feitas continuam no histórico.')) {
      Produtos.excluir(idExcluir);
      desenharTabela();
    }
  }
});

desenharTabela();
