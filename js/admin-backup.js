/* Página: admin-backup.html (somente administrador) */

Sessao.exigir('admin');

const msg = document.getElementById('msg');
const chaveUltimoBackup = DB.prefixo + 'ultimoBackup';


function desenharResumo() {
  document.getElementById('resumo').innerHTML =
    '<div class="item"><span>Usuários</span><strong>' + DB.ler('usuarios').length + '</strong></div>' +
    '<div class="item"><span>Produtos</span><strong>' + DB.ler('produtos').length + '</strong></div>' +
    '<div class="item"><span>Reservas</span><strong>' + DB.ler('reservas').length + '</strong></div>';

  const ultimo = localStorage.getItem(chaveUltimoBackup);

  document.getElementById('ultimo-backup').textContent = ultimo
    ? 'Último backup feito em ' + formatarData(ultimo) + '.'
    : 'Nenhum backup foi feito ainda neste navegador.';
}


function baixarArquivo(nome, texto) {
  const blob = new Blob(['\uFEFF' + texto], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}


document.getElementById('btn-backup').addEventListener('click', function () {
  const nome = 'backup-loja-' + hojeISO() + '.csv';

  baixarArquivo(nome, Backup.gerarCSV());
  localStorage.setItem(chaveUltimoBackup, hojeISO());

  mostrarMensagem(msg, 'Backup baixado: ' + nome, 'ok');
  desenharResumo();
});


document.getElementById('btn-restaurar').addEventListener('click', function () {
  const arquivo = document.getElementById('arquivo').files[0];

  if (!arquivo) {
    mostrarMensagem(msg, 'Escolha um arquivo de backup primeiro.', 'erro');
    return;
  }

  const leitor = new FileReader();

  leitor.onload = function () {
    let dados;

    // Primeiro confere se o arquivo é válido, sem alterar nada
    try {
      dados = Backup.interpretar(leitor.result);
    } catch (erro) {
      mostrarMensagem(msg, erro.message, 'erro');
      return;
    }

    const pergunta =
      'Restaurar este backup?\n\n' +
      dados.usuarios.length + ' usuário(s), ' +
      dados.produtos.length + ' produto(s), ' +
      dados.reservas.length + ' reserva(s).\n\n' +
      'Os dados atuais serão substituídos.';

    if (!confirm(pergunta)) return;

    Backup.restaurar(leitor.result);

    // Se o administrador logado não existir no backup, volta para o login
    if (!Sessao.usuarioAtual()) {
      alert('Backup restaurado. Entre novamente com um usuário do backup.');
      Sessao.sair();
      return;
    }

    mostrarMensagem(msg, 'Backup restaurado com sucesso.', 'ok');
    document.getElementById('arquivo').value = '';
    desenharResumo();
  };

  leitor.onerror = function () {
    mostrarMensagem(msg, 'Não foi possível ler o arquivo.', 'erro');
  };

  leitor.readAsText(arquivo, 'UTF-8');
});

desenharResumo();
