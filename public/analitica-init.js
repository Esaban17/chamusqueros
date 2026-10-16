// Analítica de Vercel: debe correr ANTES de /_vercel/insights/script.js (lee window.vaq al iniciar).
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
// El parámetro ?sala= es el pase a una sala viva: no debe llegar a la analítica. Si falla, se descarta el evento.
window.va('beforeSend', function (e) {
  try {
    var u = new URL(e.url);
    u.searchParams.delete('sala');
    return Object.assign({}, e, { url: u.toString() });
  } catch (_) { return null; }
});
