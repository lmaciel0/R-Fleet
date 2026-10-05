// Aplica o tema antes de pintar: escolha salva do usuário, senão o tema do sistema (ver src/utils/tema.ts).
// Fica num arquivo próprio (e não inline no index.html) para a Content-Security-Policy do render.yaml
// poder usar script-src 'self' sem liberar script inline.
(function () {
  var salvo = null;
  try { salvo = localStorage.getItem('rfleet_tema'); } catch (e) {}
  var escuro = salvo ? salvo === 'escuro' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.tema = escuro ? 'escuro' : 'claro';
  document.querySelector('meta[name="theme-color"]').content = escuro ? '#0C1527' : '#0B1426';
})();
