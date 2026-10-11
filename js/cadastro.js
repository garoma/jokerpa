/* Página: cadastro.html */

document.getElementById('form-cadastro').addEventListener('submit', function (e) {
  e.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const usuario = document.getElementById('usuario').value.trim();
  const senha = document.getElementById('senha').value;
  const confirmar = document.getElementById('confirmar').value;
  const msg = document.getElementById('msg');

  if (senha !== confirmar) {
    mostrarMensagem(msg, 'As senhas não são iguais.', 'erro');
    return;
  }

  const resultado = Usuarios.cadastrar(nome, usuario, senha, telefone);

  if (!resultado.ok) {
    mostrarMensagem(msg, resultado.msg, 'erro');
    return;
  }

  mostrarMensagem(msg, 'Conta criada! Indo para o login...', 'ok');

  setTimeout(function () {
    window.location.href = 'login.html';
  }, 1200);
});
