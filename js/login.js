/* Página: login.html */

// Se já estiver logado, vai direto para a página certa
(function () {
  const atual = Sessao.usuarioAtual();
  if (atual) {
    window.location.href = atual.perfil === 'admin' ? 'admin-produtos.html' : 'loja.html';
  }
})();

document.getElementById('form-login').addEventListener('submit', function (e) {
  e.preventDefault();

  const usuario = document.getElementById('usuario').value.trim();
  const senha = document.getElementById('senha').value;
  const msg = document.getElementById('msg');

  const encontrado = Usuarios.autenticar(usuario, senha);

  if (!encontrado) {
    mostrarMensagem(msg, 'Usuário ou senha incorretos.', 'erro');
    return;
  }

  Sessao.entrar(encontrado);

  window.location.href = encontrado.perfil === 'admin'
    ? 'admin-produtos.html'
    : 'loja.html';
});
