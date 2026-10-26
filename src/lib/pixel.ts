/**
 * Página de passagem com o Pixel do Meta. Um redirecionamento 302 não executa
 * JavaScript, então quando o negócio tem Pixel o link responde com esta página:
 * ela carrega o Pixel, envia o PageView e segue para o destino em instantes.
 */

export const PIXEL_ID_PATTERN = /^[0-9]{10,20}$/;

/** Espera depois de o script do Pixel carregar, para a requisição sair. */
const AFTER_LOAD_MS = 300;
/** Limite total: se o script não carregar (bloqueador, rede lenta), segue assim mesmo. */
const MAX_WAIT_MS = 1500;

export function isValidPixelId(value: string | null | undefined): value is string {
  return typeof value === "string" && PIXEL_ID_PATTERN.test(value);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** JSON seguro dentro de <script>: impede fechar a tag com "</script>". */
function scriptString(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function buildPixelRedirectPage(pixelId: string, location: string): string {
  if (!isValidPixelId(pixelId)) throw new Error("Pixel ID inválido");
  const href = escapeHtml(location);

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="3;url=${href}">
<title>Abrindo…</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font:16px system-ui,sans-serif;color:#555;background:#fff}@media(prefers-color-scheme:dark){body{color:#aaa;background:#111}}a{color:inherit}</style>
<script>
(function(){
  var to = ${scriptString(location)}, done = false;
  function go(){ if (done) return; done = true; location.replace(to); }
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;t.onload=function(){setTimeout(go,${AFTER_LOAD_MS})};t.onerror=go;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${pixelId}');
  fbq('track', 'PageView');
  setTimeout(go, ${MAX_WAIT_MS});
})();
</script>
</head>
<body>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${pixelId}&amp;ev=PageView&amp;noscript=1"></noscript>
<p><a href="${href}">Abrindo…</a></p>
</body>
</html>`;
}
