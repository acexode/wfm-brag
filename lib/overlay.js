// Injected into every page before load. Draws a visible cursor, click ripples,
// a lower-third callout, a scene badge and a spotlight — headless capture has no OS cursor.
(() => {
  if (window.__demo) return;
  const INK = '#24201C';
  const ACCENT = '#2B2A8C';
  const ACCENT_SOFT = '#8F8EF0';

  const css = `
  #__demo-root{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:'Noto Sans',system-ui,sans-serif}
  #__demo-cursor{position:fixed;left:0;top:0;width:30px;height:30px;transform:translate(-3px,-2px);transition:transform 80ms ease-out;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
  #__demo-cursor.down{transform:translate(-3px,-2px) scale(.86)}
  .__demo-ripple{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid ${ACCENT};background:rgba(43,42,140,.18);animation:__demo-rip 650ms ease-out forwards}
  @keyframes __demo-rip{to{transform:scale(4.2);opacity:0}}
  #__demo-callout{position:fixed;left:56px;bottom:56px;max-width:1100px;display:flex;align-items:stretch;border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(20,18,16,.35);opacity:0;transform:translateY(24px);transition:opacity 420ms ease,transform 520ms cubic-bezier(.2,.8,.2,1)}
  #__demo-callout.on{opacity:1;transform:none}
  #__demo-callout .bar{width:8px;background:linear-gradient(${ACCENT_SOFT},${ACCENT})}
  #__demo-callout .body{background:rgba(36,32,28,.94);color:#fff;padding:18px 26px 18px 22px}
  #__demo-callout .kicker{font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:${ACCENT_SOFT};font-weight:700;margin-bottom:4px}
  #__demo-callout .text{font-size:27px;font-weight:600;line-height:1.3}
  #__demo-badge{position:fixed;right:40px;top:28px;background:${INK};color:#fff;border-radius:999px;padding:9px 20px 9px 12px;font-size:17px;font-weight:600;display:flex;gap:10px;align-items:center;opacity:0;transform:translateY(-12px);transition:all 450ms ease;box-shadow:0 10px 30px rgba(0,0,0,.25)}
  #__demo-badge.on{opacity:1;transform:none}
  #__demo-badge .num{background:${ACCENT};border-radius:999px;padding:2px 10px;font-size:15px}
  #__demo-spot{position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(20,18,16,.45),0 0 0 3px ${ACCENT_SOFT};opacity:0;transition:all 450ms cubic-bezier(.2,.8,.2,1)}
  #__demo-spot.on{opacity:1}
  `;

  function mount() {
    if (document.getElementById('__demo-root')) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    const root = document.createElement('div');
    root.id = '__demo-root';
    root.innerHTML = `
      <div id="__demo-spot"></div>
      <div id="__demo-badge"><span class="num"></span><span class="label"></span></div>
      <div id="__demo-callout"><div class="bar"></div><div class="body"><div class="kicker"></div><div class="text"></div></div></div>
      <svg id="__demo-cursor" viewBox="0 0 24 24"><path d="M4 2.5 L4 19.5 L8.6 15.3 L11.6 21.8 L14.6 20.4 L11.7 14.1 L18 14.1 Z" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    document.documentElement.appendChild(root);
    const saved = JSON.parse(sessionStorage.getItem('__demo_pos') || 'null');
    if (saved) place(saved.x, saved.y);
  }

  function place(x, y) {
    const c = document.getElementById('__demo-cursor');
    if (!c) return;
    c.style.left = x + 'px';
    c.style.top = y + 'px';
  }

  window.addEventListener('mousemove', (e) => {
    place(e.clientX, e.clientY);
    sessionStorage.setItem('__demo_pos', JSON.stringify({ x: e.clientX, y: e.clientY }));
  }, true);
  window.addEventListener('mousedown', (e) => {
    document.getElementById('__demo-cursor')?.classList.add('down');
    const r = document.createElement('div');
    r.className = '__demo-ripple';
    r.style.left = e.clientX + 'px';
    r.style.top = e.clientY + 'px';
    document.getElementById('__demo-root')?.appendChild(r);
    setTimeout(() => r.remove(), 700);
  }, true);
  window.addEventListener('mouseup', () => document.getElementById('__demo-cursor')?.classList.remove('down'), true);

  window.__demo = {
    callout(text, kicker) {
      mount();
      const el = document.getElementById('__demo-callout');
      el.querySelector('.text').textContent = text;
      el.querySelector('.kicker').textContent = kicker || '';
      el.querySelector('.kicker').style.display = kicker ? '' : 'none';
      el.classList.add('on');
    },
    hideCallout() {
      document.getElementById('__demo-callout')?.classList.remove('on');
    },
    badge(num, label) {
      mount();
      const el = document.getElementById('__demo-badge');
      el.querySelector('.num').textContent = num;
      el.querySelector('.label').textContent = label;
      el.classList.add('on');
      clearTimeout(window.__demoBadgeT);
      window.__demoBadgeT = setTimeout(() => el.classList.remove('on'), 4200);
    },
    spotlight(rect) {
      mount();
      const el = document.getElementById('__demo-spot');
      if (!rect) { el.classList.remove('on'); return; }
      const pad = 10;
      Object.assign(el.style, {
        left: rect.x - pad + 'px', top: rect.y - pad + 'px',
        width: rect.width + pad * 2 + 'px', height: rect.height + pad * 2 + 'px',
      });
      el.classList.add('on');
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  // SPA re-renders can't remove it (it lives on <html>), but re-mount after full navigations.
  new MutationObserver(() => { if (!document.getElementById('__demo-root') && document.head) mount(); })
    .observe(document.documentElement, { childList: true });
})();
