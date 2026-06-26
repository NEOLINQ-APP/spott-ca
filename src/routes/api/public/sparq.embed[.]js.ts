import { createFileRoute } from "@tanstack/react-router";

// Serves the bootstrap script that businesses embed on their website.
// Usage: <script src=".../api/public/sparq/embed.js" data-sparq="slug" async></script>

const SCRIPT = `(function(){
  try {
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        if ((all[i].src||'').indexOf('/api/public/sparq/embed.js') !== -1) { s = all[i]; break; }
      }
    }
    if (!s) return;
    var slug = s.getAttribute('data-sparq');
    if (!slug) return;
    var origin = new URL(s.src).origin;

    if (document.getElementById('sparq-widget-'+slug)) return;

    var wrap = document.createElement('div');
    wrap.id = 'sparq-widget-'+slug;
    wrap.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483000;font-family:-apple-system,system-ui,sans-serif';

    var btn = document.createElement('button');
    btn.setAttribute('aria-label','Open chat');
    btn.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    btn.style.cssText = 'width:60px;height:60px;border-radius:50%;border:none;background:#3B82F6;color:white;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;transition:transform .15s';
    btn.onmouseenter = function(){ btn.style.transform='scale(1.05)'; };
    btn.onmouseleave = function(){ btn.style.transform='scale(1)'; };

    var frame = document.createElement('iframe');
    frame.src = origin + '/sparq/widget/' + slug;
    frame.style.cssText = 'position:absolute;bottom:74px;right:0;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 120px);border:none;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.2);background:white;display:none';
    frame.setAttribute('allow','clipboard-write');

    var open = false;
    btn.onclick = function(){
      open = !open;
      frame.style.display = open ? 'block' : 'none';
    };

    wrap.appendChild(frame);
    wrap.appendChild(btn);
    (document.body || document.documentElement).appendChild(wrap);
  } catch(e) { console && console.error && console.error('Sparq embed error', e); }
})();`;

export const Route = createFileRoute("/api/public/sparq/embed[.]js")({
  server: {
    handlers: {
      GET: async () => new Response(SCRIPT, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*",
        },
      }),
    },
  },
});
