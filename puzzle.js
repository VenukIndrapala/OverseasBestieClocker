'use strict';
/* =====================================================================
   puzzle.js - the FINAL PUZZLE (load AFTER letter.js and pumpkin.js)
   ---------------------------------------------------------------------
   - the "Final Puzzle" button at the bottom of the letter calls  startFinalPuzzle()
   - the picture to solve is a still image of the video:
       1. if FINAL_POSTER exists (a screenshot you saved) it is used,
       2. otherwise a frame is taken from the video itself (needs the page to be served from a web address, e.g. GitHub Pages),
       3. otherwise a built-in picture is used (the video still plays at the end).
   - when the last piece clicks into place the finished picture grows to fill the screen and the VIDEO starts playing
   - nothing is saved: closing and re-opening keeps your progress until the page is reloaded
   Everything is wrapped in one function so it can not clash with letter.js / pumpkin.js.
   ===================================================================== */
(() => {
  /* ------------------ SETTINGS: change these two lines to match your files ------------------ */
  const FINAL_VIDEO  = 'video/final.mp4';     // <- your video (put it in a folder called "video" next to index.html)
  const FINAL_POSTER = 'video/final.jpg';     // <- OPTIONAL screenshot of the video to use as the puzzle picture ('' = always take a frame from the video)
  const FRAME_AT = 1;                         // seconds into the video where the still frame is taken (only used when there is no poster)
  /* ------------------------------------------------------------------------------------------- */

  const $ = s => document.querySelector(s);
  const toast = t => { const e = $('#toast'); if (!e) return; e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 3200); };

  const DEFAULT_PIC = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"><defs>'
    + '<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1b4d"/><stop offset=".45" stop-color="#c2487a"/><stop offset=".75" stop-color="#ff9a5a"/><stop offset="1" stop-color="#ffd28a"/></linearGradient>'
    + '<radialGradient id="g"><stop offset="0" stop-color="#fff6d6"/><stop offset=".5" stop-color="#ffd36b"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/></radialGradient></defs>'
    + '<rect width="1200" height="900" fill="url(#s)"/>'
    + '<g fill="#fff" opacity=".85"><circle cx="120" cy="90" r="3"/><circle cx="300" cy="160" r="2.5"/><circle cx="520" cy="70" r="3"/><circle cx="760" cy="130" r="2.5"/><circle cx="980" cy="80" r="3"/><circle cx="1120" cy="190" r="2.5"/><circle cx="420" cy="250" r="2"/><circle cx="880" cy="260" r="2"/></g>'
    + '<circle cx="840" cy="560" r="230" fill="url(#g)"/><circle cx="840" cy="560" r="105" fill="#fff1c1"/>'
    + '<g fill="#fff" opacity=".7"><ellipse cx="260" cy="330" rx="130" ry="26"/><ellipse cx="340" cy="310" rx="90" ry="24"/><ellipse cx="980" cy="380" rx="150" ry="24"/><ellipse cx="900" cy="360" rx="80" ry="20"/></g>'
    + '<path d="M0 640 L180 470 L330 600 L520 420 L720 620 L900 500 L1200 700 L1200 900 L0 900Z" fill="#5a2a5e"/>'
    + '<path d="M0 740 L200 600 L400 720 L640 580 L860 730 L1060 620 L1200 700 L1200 900 L0 900Z" fill="#3a1b45"/>'
    + '<path d="M0 820 Q300 740 600 810 T1200 790 L1200 900 L0 900Z" fill="#1f0f2b"/>'
    + '<g fill="#150a1f"><path d="M150 820 l30 -150 l30 150z"/><path d="M200 830 l26 -120 l26 120z"/><path d="M1000 815 l32 -170 l32 170z"/><path d="M1055 825 l24 -110 l24 110z"/></g>'
    + '<g fill="none" stroke="#2b1b4d" stroke-width="5" stroke-linecap="round"><path d="M560 250 q14 -18 28 0 q14 -18 28 0"/><path d="M650 300 q10 -14 20 0 q10 -14 20 0"/><path d="M470 330 q9 -12 18 0 q9 -12 18 0"/></g></svg>');

  /* progress lives only in memory (no saving), so a page reload starts the puzzle fresh */
  const PZS = { locked: [], solved: false };
  const pzState = () => PZS;
  const pzSave = () => {};

  /* ---- the picture: poster -> frame from the video -> built-in ---- */
  function pzLoad(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }); }

  function frameFromVideo(url) {                              // grabs one still frame from the video and turns it into a picture
    return new Promise((ok, no) => {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'metadata';
      const fail = () => { clearTimeout(timer); v.removeAttribute('src'); v.load(); no(new Error('no frame')); };
      const timer = setTimeout(fail, 25000);
      v.addEventListener('error', fail);
      v.addEventListener('loadedmetadata', () => { v.currentTime = Math.min(FRAME_AT, (v.duration || 2) / 2); });
      v.addEventListener('seeked', () => {
        try {
          const k = Math.min(1, 1600 / (v.videoWidth || 1600)), c = document.createElement('canvas');
          c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
          c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
          c.toBlob(b => {
            if (!b) return fail();
            const u = URL.createObjectURL(b);
            pzLoad(u).then(i => { clearTimeout(timer); v.removeAttribute('src'); v.load(); ok({ img: i, src: u }); }).catch(fail);
          }, 'image/jpeg', .92);
        } catch (e) { fail(); }
      }, { once: true });
      v.src = url;
    });
  }
  async function pzPicture() {
    if (FINAL_POSTER) { try { return { img: await pzLoad(FINAL_POSTER), src: FINAL_POSTER }; } catch (e) { /* no poster file: try the video */ } }
    try { return await frameFromVideo(FINAL_VIDEO); } catch (e) { /* could not read a frame */ }
    toast("Couldn't load the puzzle picture - using the built-in one");
    return { img: await pzLoad(DEFAULT_PIC), src: DEFAULT_PIC };
  }

  /* ---- jigsaw piece outline ---- */
  function pzRng(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    let a = h >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pzEdge(x0, y0, x1, y1, s) {                        // one side: s = 0 flat, +1 tab sticks out, -1 notch goes in
    if (!s) return 'L' + x1.toFixed(1) + ' ' + y1.toFixed(1);
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = uy, ny = -ux;
    const P = (a, b) => (x0 + ux * a * L + nx * -b * L * s).toFixed(1) + ' ' + (y0 + uy * a * L + ny * -b * L * s).toFixed(1);
    return 'L' + P(.36, 0) + 'C' + P(.42, 0) + ' ' + P(.45, -.02) + ' ' + P(.45, -.07) + 'C' + P(.45, -.10) + ' ' + P(.40, -.11) + ' ' + P(.40, -.17)
      + 'C' + P(.40, -.26) + ' ' + P(.60, -.26) + ' ' + P(.60, -.17) + 'C' + P(.60, -.11) + ' ' + P(.55, -.10) + ' ' + P(.55, -.07)
      + 'C' + P(.55, -.02) + ' ' + P(.58, 0) + ' ' + P(.64, 0) + 'L' + x1.toFixed(1) + ' ' + y1.toFixed(1);
  }
  function pzPath(r, c, G) {
    const { cols, rows, cw, ch, pad, H, V } = G, x = pad, y = pad;
    const top = r ? -H[r - 1][c] : 0, bottom = r < rows - 1 ? H[r][c] : 0, left = c ? -V[r][c - 1] : 0, right = c < cols - 1 ? V[r][c] : 0;
    return 'M' + x + ' ' + y + pzEdge(x, y, x + cw, y, top) + pzEdge(x + cw, y, x + cw, y + ch, right)
      + pzEdge(x + cw, y + ch, x, y + ch, bottom) + pzEdge(x, y + ch, x, y, left) + 'Z';
  }

  /* ---- the game ---- */
  const PZ = { img: null, src: '', G: null, pieces: [], z: 10, open: false, rt: 0 };

  async function openPuzzle() {
    const box = $('#puz'); box.hidden = false; document.body.classList.add('puzopen'); PZ.open = true;
    $('#puzInfo').textContent = 'Loading picture…'; $('#puzStage').innerHTML = '';
    if (!PZ.img) { const pic = await pzPicture(); PZ.img = pic.img; PZ.src = pic.src; }   // the picture is made once and reused
    if (PZ.open) pzBuild();
  }
  function closePuzzle() {
    const v = $('#puzStage .pvid'); if (v) { try { v.pause(); } catch (e) {} }
    $('#puz').hidden = true; document.body.classList.remove('puzopen'); PZ.open = false; $('#puzStage').innerHTML = '';
  }

  function pzBuild() {
    const st = $('#puzStage'), W = st.clientWidth, Hh = st.clientHeight, iw = PZ.img.naturalWidth || 1200, ih = PZ.img.naturalHeight || 900;
    const land = iw >= ih, cols = land ? 4 : 3, rows = land ? 3 : 4;
    const sc = Math.min(W * 0.62 / iw, Hh * 0.52 / ih, 760 / iw), bw = Math.round(iw * sc), bh = Math.round(ih * sc);
    const cw = bw / cols, ch = bh / rows, pad = Math.round(0.27 * Math.max(cw, ch)), bx = Math.round((W - bw) / 2), by = Math.round((Hh - bh) / 2);
    const rnd = pzRng('final-puzzle'), sg = () => rnd() < .5 ? -1 : 1;
    const H = Array.from({ length: rows - 1 }, () => Array.from({ length: cols }, sg)), V = Array.from({ length: rows }, () => Array.from({ length: cols - 1 }, sg));
    const G = PZ.G = { cols, rows, cw, ch, pad, H, V, bx, by, bw, bh, W, Hh };
    const S = pzState(); st.className = 'puz-stage'; st.innerHTML = '';
    if (S.solved) { pzFinal(false); return; }

    const bd = document.createElement('div'); bd.className = 'pz-board'; Object.assign(bd.style, { left: bx + 'px', top: by + 'px', width: bw + 'px', height: bh + 'px' });
    st.appendChild(bd);

    PZ.pieces = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, d = pzPath(r, c, G), w = cw + 2 * pad, hh = ch + 2 * pad, el = document.createElement('div');
      el.className = 'pz'; el.style.width = w + 'px'; el.style.height = hh + 'px';
      el.innerHTML = `<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}"><defs><clipPath id="pzc${i}"><path d="${d}"/></clipPath></defs>`
        + `<g clip-path="url(#pzc${i})"><image href="${PZ.src}" x="${pad - c * cw}" y="${pad - r * ch}" width="${bw}" height="${bh}" preserveAspectRatio="none"/></g>`
        + `<path class="pz-edge" d="${d}"/><path class="pz-hit" d="${d}"/></svg>`;
      st.appendChild(el);
      PZ.pieces.push({ i, el, hx: bx + c * cw, hy: by + r * ch, x: 0, y: 0, locked: false });
    }
    PZ.pieces.forEach(p => {
      if (S.locked.includes(p.i)) { pzPlace(p, p.hx, p.hy); p.locked = true; p.el.classList.add('lock'); }
      else { const q = pzScatter(p); pzPlace(p, q.x, q.y); p.placed = true; pzDrag(p); }
    });
    pzCount();
  }
  const pzPlace = (p, x, y) => { p.x = x; p.y = y; p.el.style.transform = `translate3d(${x - PZ.G.pad}px,${y - PZ.G.pad}px,0)`; };
  function pzScatter(p) {                                      // a spot around the board (not on it), as far from the other loose pieces as possible
    const { cw, ch, bx, by, bw, bh, W, Hh } = PZ.G, m = 8, others = PZ.pieces.filter(q => q !== p && !q.locked && q.placed);
    let best = null, bd = -1, any = null;
    for (let t = 0; t < 160; t++) {
      const x = m + Math.random() * Math.max(1, W - cw - 2 * m), y = m + Math.random() * Math.max(1, Hh - ch - 2 * m);
      any = { x, y };
      if (!(x + cw < bx - 6 || x > bx + bw + 6 || y + ch < by - 6 || y > by + bh + 6)) continue;       // off the board only
      const d = others.length ? Math.min(...others.map(q => Math.hypot(q.x - x, q.y - y))) : 1e9;
      if (d > bd) { bd = d; best = { x, y }; }
    }
    return best || any;
  }
  function pzCount() { const n = PZ.pieces.filter(p => p.locked).length; $('#puzInfo').textContent = n + ' / ' + PZ.pieces.length + ' pieces placed'; }
  function pzDrag(p) {
    const el = p.el; let gx = 0, gy = 0, on = false;
    el.addEventListener('pointerdown', e => {
      if (p.locked || e.button > 0) return; e.preventDefault(); on = true;
      const r = $('#puzStage').getBoundingClientRect(); gx = e.clientX - r.left - p.x; gy = e.clientY - r.top - p.y;
      el.setPointerCapture(e.pointerId); el.classList.remove('snap'); el.classList.add('drag'); el.style.zIndex = ++PZ.z;
    });
    el.addEventListener('pointermove', e => {
      if (!on) return; const { cw, ch, W, Hh } = PZ.G, r = $('#puzStage').getBoundingClientRect();
      pzPlace(p, Math.min(W - cw * .5, Math.max(-cw * .5, e.clientX - r.left - gx)), Math.min(Hh - ch * .5, Math.max(-ch * .5, e.clientY - r.top - gy)));
    });
    const up = () => {
      if (!on) return; on = false; el.classList.remove('drag');
      const { cw, ch } = PZ.G;
      if (Math.hypot(p.x - p.hx, p.y - p.hy) < 0.35 * Math.min(cw, ch)) {              // close enough: snap into place and lock
        el.classList.add('snap'); pzPlace(p, p.hx, p.hy); p.locked = true; el.classList.add('lock'); el.style.zIndex = '';
        const S = pzState(); if (!S.locked.includes(p.i)) S.locked.push(p.i); pzSave(S); pzCount();
        if (PZ.pieces.every(q => q.locked)) setTimeout(pzWin, 350);
      }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  function pzWin() {
    const S = pzState(); S.solved = true; pzSave(S);
    $('#puzStage').classList.add('solved'); pzFinal(true);
  }

  /* the size the finished picture / video takes on screen (same shape as the picture) */
  function pzBigRect() {
    const st = $('#puzStage'), W = st.clientWidth, Hh = st.clientHeight, ar = (PZ.img.naturalWidth || 1200) / (PZ.img.naturalHeight || 900);
    let w = W * 0.92, h = w / ar;
    if (h > Hh * 0.88) { h = Hh * 0.88; w = h * ar; }
    return { left: (W - w) / 2, top: (Hh - h) / 2, width: w, height: h };
  }
  const pzSetRect = (el, R) => Object.assign(el.style, { left: R.left + 'px', top: R.top + 'px', width: R.width + 'px', height: R.height + 'px' });

  function pzFinal(anim) {                                    // the finished picture grows out of the board to fill the screen, then the video plays
    const st = $('#puzStage'), { bx, by, bw, bh } = PZ.G, R = pzBigRect(), k = R.width / bw;
    const im = document.createElement('img'); im.className = 'pfinal'; im.src = PZ.src; im.alt = 'The finished puzzle picture';
    Object.assign(im.style, { left: bx + 'px', top: by + 'px', width: bw + 'px', height: bh + 'px' }); st.appendChild(im);
    const big = `translate(${R.left + R.width / 2 - (bx + bw / 2)}px,${R.top + R.height / 2 - (by + bh / 2)}px) scale(${k})`;
    $('#puzInfo').textContent = 'Puzzle complete!';
    if (!anim) { im.style.transition = 'none'; im.style.transform = big; im.classList.add('show'); pzVideo(); return; }
    requestAnimationFrame(() => im.classList.add('show'));
    setTimeout(() => { im.style.transform = big; }, 700);
    setTimeout(pzVideo, 1700);                                // once the picture has grown, the video takes its place
  }
  function pzVideo() {
    const st = $('#puzStage'), im = $('#puzStage .pfinal');
    if (!PZ.open || !im || $('#puzStage .pvid')) return;
    const v = document.createElement('video');
    v.className = 'pvid'; v.controls = true; v.playsInline = true; v.preload = 'auto'; v.poster = PZ.src;
    pzSetRect(v, pzBigRect()); v.src = FINAL_VIDEO; st.appendChild(v);
    requestAnimationFrame(() => v.classList.add('show'));
    v.addEventListener('playing', () => { im.remove(); }, { once: true });
    v.addEventListener('error', () => toast("Couldn't load the video - check that " + FINAL_VIDEO + " exists"));
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => {                      // browser blocked autoplay with sound: start muted, the viewer can unmute
      v.muted = true;
      const p2 = v.play();
      if (p2 && p2.then) p2.then(() => toast('Tap the speaker icon on the video for sound'), () => {});   // still blocked: the play button on the video works
    });
  }
  function pzRefit() {                                        // screen size changed after the puzzle was solved: just resize, do not restart the video
    const R = pzBigRect();
    ['.pfinal', '.pvid'].forEach(sel => { const el = $('#puzStage ' + sel); if (!el) return; el.style.transition = 'none'; el.style.transform = 'none'; pzSetRect(el, R); });
  }

  $('#puzClose').addEventListener('click', closePuzzle);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && PZ.open) closePuzzle(); });
  window.addEventListener('resize', () => { if (!PZ.open || !PZ.img) return; clearTimeout(PZ.rt); PZ.rt = setTimeout(() => { if (PZS.solved) pzRefit(); else pzBuild(); }, 200); });

  window.startFinalPuzzle = openPuzzle;                       // the "Final Puzzle" button in the letter calls this
})();
