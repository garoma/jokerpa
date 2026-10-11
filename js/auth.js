/* ==========================================================
   SESSÃO, PROTEÇÃO DE PÁGINAS E MENU
   ========================================================== */

const Sessao = {

  entrar(usuario) {
    localStorage.setItem(DB.prefixo + 'sessao', usuario.id);
  },

  sair() {
    localStorage.removeItem(DB.prefixo + 'sessao');
    window.location.href = 'login.html';
  },

  usuarioAtual() {
    const id = localStorage.getItem(DB.prefixo + 'sessao');
    return id ? Usuarios.buscarPorId(id) : null;
  },

  // perfilExigido: 'cliente' ou 'admin'
  // Se não estiver logado ou não tiver permissão, volta para o login
  exigir(perfilExigido) {
    const usuario = this.usuarioAtual();

    if (!usuario || usuario.perfil !== perfilExigido) {
      window.location.href = 'login.html';
      return null;
    }

    montarMenu(usuario);
    return usuario;
  }
};


function montarMenu(usuario) {
  const pagina = window.location.pathname.split('/').pop();

  const links = usuario.perfil === 'admin'
    ? [
        { href: 'admin-produtos.html', texto: 'Produtos' },
        { href: 'admin-reservas.html', texto: 'Reservas e pagamentos' }
      ]
    : [
        { href: 'loja.html', texto: 'Loja' },
        { href: 'perfil.html', texto: 'Minhas compras' }
      ];

  let html = '<span class="logo">Loja Reserva</span>';

  links.forEach(function (link) {
    const ativo = link.href === pagina ? ' class="ativo"' : '';
    html += '<a href="' + link.href + '"' + ativo + '>' + link.texto + '</a>';
  });

  html += '<span class="usuario-nome">' + esc(usuario.nome) + '</span>';
  html += '<a href="#" id="btn-sair">Sair</a>';

  const nav = document.getElementById('navbar');
  nav.innerHTML = html;

  document.getElementById('btn-sair').addEventListener('click', function (e) {
    e.preventDefault();
    Sessao.sair();
  });
}
