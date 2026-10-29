'use strict';
/* =====================================================================
   Pumpkin add-on  (load AFTER letter.js)
   ---------------------------------------------------------------------
   1. watches the scratch card; when the prize is revealed (#scratch gets the "cleared" class)
      it waits 5 seconds
   2. the scratch card slides UP and out, the coin fades away, the pumpkin slides in from the BOTTOM
   3. swipe across the pumpkin (mouse or finger) to cut it: the pumpkin is split along your line into
      two pieces that spring apart with a little wobble. You can keep cutting the pieces.
   Needs pumpkin.png next to this file. letter.js / letter.css are NOT touched.
   ===================================================================== */
(() => {
  const WAIT_MS = 5000;                      // time the prize stays visible before the swap
  const SEP = 0.035;                         // how far a piece springs away from the cut (fraction of the pumpkin size)
  const rm = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ---------- styles ---------- */
  const st = document.createElement('style');
  st.textContent = `
  .scratch.out .swrap{translate:0 -125vh;transition:translate .95s cubic-bezier(.65,0,.35,1)}
  .coin.free.gone{opacity:0;pointer-events:none;transition:opacity .4s,scale .5s}

  .pumpkin{position:fixed;inset:0;z-index:600;display:grid;place-items:center;visibility:hidden;pointer-events:none;touch-action:none;cursor:crosshair;-webkit-user-select:none;user-select:none}
  .pumpkin.show{visibility:visible;pointer-events:auto}
  .pslide{display:flex;flex-direction:column;align-items:center;gap:18px;translate:0 115vh;transition:translate 1.05s cubic-bezier(.22,1,.36,1) .8s}
  .pumpkin.show .pslide{translate:0 0}
  /* white backdrop + multiply on the pieces makes the picture's white background vanish, so pieces never hide each other */
  .pstage{position:relative;width:min(440px,88vw,62vh);aspect-ratio:1;background:#fff}
  .ppiece{position:absolute;inset:0;background:url(pumpkin.png) center/100% 100% no-repeat;mix-blend-mode:multiply;will-change:translate,rotate}
  .phint{margin:0;min-height:1.4em;font:500 15px var(--font);color:var(--ink2);opacity:0;transition:opacity .5s 1.8s}
  .pumpkin.show .phint{opacity:1}
  .pumpkin .phint.hide{opacity:0;transition-delay:0s}
  .ptrail{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
  #pline{stroke:var(--accent);stroke-width:4;stroke-linecap:round;stroke-dasharray:2 9;opacity:0;transition:opacity .3s;filter:drop-shadow(0 0 4px rgba(254,98,98,.8))}
  #pline.on{opacity:1;transition:none}
  @media(prefers-reduced-motion:reduce){.pslide,.phint,.scratch.out .swrap{transition:none}}
  `;
  document.head.appendChild(st);

  /* ---------- markup ---------- */
  const sec = document.createElement('section');
  sec.className = 'pumpkin'; sec.setAttribute('aria-label', 'Pumpkin. Swipe across it to cut it.');
  sec.innerHTML = '<div class="pslide"><div class="pstage" id="pstage"></div><p class="phint" id="phint">Swipe across the pumpkin to cut it</p></div>' +
                  '<svg class="ptrail" aria-hidden="true"><line id="pline" x1="0" y1="0" x2="0" y2="0"/></svg>';
  document.body.appendChild(sec);
  new Image().src = 'pumpkin.png';           // preload

  const stage = sec.querySelector('#pstage'), hint = sec.querySelector('#phint'), line = sec.querySelector('#pline');
  const scratchEl = document.getElementById('scratch'), coinEl = document.getElementById('coin');

  /* ---------- the pieces ---------- */
  let pieces = [], started = false, ready = false, down = null;

  function paint(p) {
    p.el.style.clipPath = 'polygon(' + p.poly.map(q => (q[0] * 100) + '% ' + (q[1] * 100) + '%').join(',') + ')';
    p.el.style.translate = (p.ox * 100) + '% ' + (p.oy * 100) + '%';
  }
  function makePiece(poly, ox, oy) {
    const el = document.createElement('div'); el.className = 'ppiece'; stage.appendChild(el);
    const p = { el, poly, ox, oy }; paint(p); pieces.push(p); return p;
  }
  const area = poly => Math.abs(poly.reduce((s, p, i) => { const n = poly[(i + 1) % poly.length]; return s + p[0] * n[1] - n[0] * p[1]; }, 0)) / 2;

  /* keep the part of a polygon on one side of the (infinite) line A-B  (Sutherland-Hodgman) */
  function side(poly, A, B, sign) {
    const d = p => sign * ((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])), out = [];
    for (let i = 0; i < poly.length; i++) {
      const c = poly[i], n = poly[(i + 1) % poly.length], dc = d(c), dn = d(n);
      if (dc >= 0) out.push(c);
      if ((dc > 0 && dn < 0) || (dc < 0 && dn > 0)) { const t = dc / (dc - dn); out.push([c[0] + (n[0] - c[0]) * t, c[1] + (n[1] - c[1]) * t]); }
    }
    return out;
  }

  function cut(a, b) {                                   // a, b: the swipe, in pumpkin units (0..1)
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    if (len < 0.05) return false;
    const nx = -dy / len, ny = dx / len;                 // the + side's direction
    let did = false;
    pieces.slice().forEach(p => {
      const A = [a[0] - p.ox, a[1] - p.oy], B = [b[0] - p.ox, b[1] - p.oy];   // the line in this piece's own space
      const pos = side(p.poly, A, B, 1), neg = side(p.poly, A, B, -1);
      if (pos.length < 3 || neg.length < 3 || area(pos) < 0.003 || area(neg) < 0.003) return;   // the line missed this piece
      did = true;
      p.el.remove(); pieces.splice(pieces.indexOf(p), 1);
      [[pos, 1], [neg, -1]].forEach(([poly, s]) => {
        const np = makePiece(poly, p.ox + nx * SEP * s, p.oy + ny * SEP * s);
        if (!rm) np.el.animate(                          // spring apart from where it was, with a small wobble
          [{ translate: (p.ox * 100) + '% ' + (p.oy * 100) + '%', rotate: '0deg' },
           { rotate: (5 * s) + 'deg', offset: .4 },
           { rotate: '0deg' }],
          { duration: 720, easing: 'cubic-bezier(.34,1.3,.5,1)' });
      });
    });
    return did;
  }

  /* ---------- swipe to cut ---------- */
  const toUnit = (x, y) => { const r = stage.getBoundingClientRect(); return [(x - r.left) / r.width, (y - r.top) / r.height]; };
  const setLine = (x1, y1, x2, y2) => { line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', x2); line.setAttribute('y2', y2); };

  sec.addEventListener('pointerdown', e => {
    if (!ready || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    down = { x: e.clientX, y: e.clientY, ex: e.clientX, ey: e.clientY };
    setLine(down.x, down.y, down.x, down.y); line.classList.add('on');
  });
  window.addEventListener('pointermove', e => {
    if (!down) return;
    down.ex = e.clientX; down.ey = e.clientY;
    setLine(down.x, down.y, down.ex, down.ey);
  });
  const release = () => {
    if (!down) return;
    const d = down; down = null; line.classList.remove('on');
    if (cut(toUnit(d.x, d.y), toUnit(d.ex, d.ey))) hint.classList.add('hide');
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', () => { down = null; line.classList.remove('on'); });

  /* ---------- the hand-over: prize shown -> wait -> scratch card out, pumpkin in ---------- */
  function start() {
    scratchEl.classList.add('out');                      // scratch card slides up and away
    coinEl.classList.add('gone');                        // the coin fades out
    makePiece([[0, 0], [1, 0], [1, 1], [0, 1]], 0, 0);   // the whole pumpkin
    sec.classList.add('show');                           // pumpkin slides in from the bottom
    setTimeout(() => { ready = true; }, rm ? 0 : 1900);  // cutting works once it has landed
  }

  new MutationObserver(() => {
    if (started || !scratchEl.classList.contains('cleared')) return;
    started = true;
    setTimeout(start, rm ? 0 : WAIT_MS);
  }).observe(scratchEl, { attributes: true, attributeFilter: ['class'] });
})();
