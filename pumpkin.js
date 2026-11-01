'use strict';
/* =====================================================================
   Pumpkin add-on  (load AFTER letter.js)
   ---------------------------------------------------------------------
   1. when the prize is revealed (#scratch gets "cleared") wait 5 seconds
   2. the scratch card slides up and out, the coin fades, the pumpkin slides in from the bottom
   3. TAP THE PUMPKIN. It breaks in FIVE random jagged regions, with cracks, shards,
      seeds and pulp falling to the ground.
   4. when the 5th region has fallen the stem slides off to the right and the next scene appears.

   FIX: if IMG_SHADOW / IMG_STEM / IMG_PIECES are empty (or fail to load) the script now
   DRAWS ITS OWN PUMPKIN, so something always shows. If you paste your own picture data
   into the three constants below, your pictures are used instead.
   ===================================================================== */
(() => {
  const run = () => {
    const WAIT_MS = 5000;
    const BREAK_UNDER_FINGER = true;
    const S = 600;
    const rm = matchMedia('(prefers-reduced-motion:reduce)').matches;

    /* ---------------------------------------------------------------
       PASTE YOUR PICTURE DATA HERE (data-URIs or file paths).
       Leave as '' to use the built-in drawn pumpkin.
       --------------------------------------------------------------- */
    const IMG_SHADOW = '';
    const IMG_STEM = '';
    const IMG_PIECES = ['', '', '', '', ''];
    /* --------------------------------------------------------------- */

    const rnd = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    /* ---------- styles ---------- */
    const st = document.createElement('style');
    st.textContent = `
    .scratch.out .swrap{translate:0 -125vh;transition:translate .95s cubic-bezier(.65,0,.35,1)}
    .coin.free.gone{opacity:0;pointer-events:none;transition:opacity .4s,scale .5s}

    .pumpkin{position:fixed;inset:0;z-index:600;display:grid;place-items:center;visibility:hidden;pointer-events:none;touch-action:none;cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
    .pumpkin.show{visibility:visible;pointer-events:auto}
    .pslide{display:flex;flex-direction:column;align-items:center;gap:18px;translate:0 115vh;transition:translate 1.05s cubic-bezier(.22,1,.36,1) .8s}
    .pumpkin.show .pslide{translate:0 0}
    .pstage{position:relative;width:min(440px,88vw,62vh);aspect-ratio:1}
    .pshadow,.pstem,.pbody,.pcrack{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
    .pshadow{background:var(--ps) center/100% 100% no-repeat;transition:opacity .9s ease}
    .pstem{background:var(--pst) center/100% 100% no-repeat}
    .pchunk{position:absolute;pointer-events:none;will-change:transform,opacity;filter:drop-shadow(0 5px 4px rgba(30,12,2,.4))}
    .pfx{position:fixed;inset:0;width:100%;height:100%;z-index:610;pointer-events:none}
    .phint{margin:0;min-height:1.4em;font:500 15px var(--font,system-ui,sans-serif);color:var(--ink2,#6b5a4a);opacity:0;transition:opacity .5s 1.8s}
    .pumpkin.show .phint{opacity:1}
    .pumpkin .phint.hide{opacity:0;transition-delay:0s}

    .pumpkin.exit{pointer-events:none}
    .pumpkin.exit .pslide{translate:125vw 0;transition:translate .95s cubic-bezier(.65,0,.35,1)}
    .pumpkin.gone{display:none}
    .pscene{position:fixed;inset:0;z-index:560;display:grid;place-items:center;visibility:hidden;pointer-events:none;text-align:center;padding:24px}
    .pscene.show{visibility:visible}
    .pscene h1{margin:0;font:700 clamp(34px,8vw,80px)/1.1 var(--font,system-ui,sans-serif);color:var(--ink,#3a2a1a);opacity:0;translate:0 26px;transition:opacity .7s .55s,translate .9s cubic-bezier(.22,1,.36,1) .55s}
    .pscene.show h1{opacity:1;translate:0 0}
    @media(prefers-reduced-motion:reduce){.pslide,.phint,.pshadow,.scratch.out .swrap,.pumpkin.exit .pslide,.pscene h1{transition:none}}
    `;
    document.head.appendChild(st);

    /* ---------- markup ---------- */
    const sec = document.createElement('section');
    sec.className = 'pumpkin'; sec.setAttribute('aria-label', 'Pumpkin. Tap it to break it.');
    sec.innerHTML = '<div class="pslide"><div class="pstage" id="pstage"><div class="pshadow" id="pshadow"></div><div class="pstem" id="pstem"></div></div>' +
                    '<p class="phint" id="phint">Tap the pumpkin to break it</p></div>';
    document.body.appendChild(sec);
    const scene = document.createElement('section');
    scene.className = 'pscene'; scene.setAttribute('aria-label', 'Next scene');
    scene.innerHTML = '<h1>Placeholder</h1>';
    document.body.appendChild(scene);

    const stage = sec.querySelector('#pstage'), shadowEl = sec.querySelector('#pshadow'),
          stemEl = sec.querySelector('#pstem'), hint = sec.querySelector('#phint');
    const scratchEl = document.getElementById('scratch'), coinEl = document.getElementById('coin');
    if (!scratchEl) console.warn('[pumpkin] #scratch not found - call startPumpkin() manually to test');
    if (IMG_SHADOW) stage.style.setProperty('--ps', 'url(' + IMG_SHADOW + ')');
    if (IMG_STEM) stage.style.setProperty('--pst', 'url(' + IMG_STEM + ')');

    /* effects canvas (seeds + pulp) */
    const pfx = document.createElement('canvas'); pfx.className = 'pfx';
    document.body.appendChild(pfx);
    const pctx = pfx.getContext('2d');
    function sizePfx() { const d = Math.min(2, window.devicePixelRatio || 1); pfx.width = innerWidth * d; pfx.height = innerHeight * d; pctx.setTransform(d, 0, 0, d, 0, 0); }
    sizePfx(); addEventListener('resize', sizePfx);

    /* ---------- state ---------- */
    let built = false, buildP = null, starting = false, started = false, ready = false, won = false;
    let body, bctx, srcData, op, opIdx, label, chunkId, goneA, rdA, stemA;
    let regPix = [], regCent = [], regSeed = [], regArea = [], chunks = [];
    let totalArea = 1, pcx = S / 2, pcy = S / 2, shadowG = .9, stemOrigin = '50% 20%';
    let ccv, cc;
    const removed = [0, 0, 0, 0, 0];
    const cracking = new Set(), activeCracks = [];
    const bodies = [], parts = [];
    let curSize = 440, raf = 0, last = 0, crackRaf = 0;

    const RIM = [.85, .55, .25];
    const FR = 252, FG = 214, FB = 128;
    const PULP = ['#f28a1d', '#e0690d', '#ffb44a', '#c9540a', '#f6a02e', '#ffd08a'];

    const loadImg = src => new Promise(res => {
      if (!src) { res(null); return; }
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => { console.warn('[pumpkin] image failed to load:', String(src).slice(0, 60)); res(null); };
      i.src = src;
    });

    /* ---------- built-in drawn pumpkin (used when no picture data is available) ---------- */
    function mkCanvas() { const c = document.createElement('canvas'); c.width = c.height = S; return c; }
    function fallbackPumpkin() {
      const sh = mkCanvas(), stm = mkCanvas(), bd = mkCanvas();

      let c = sh.getContext('2d');
      c.save(); c.translate(S / 2, S * .9); c.scale(1, .13);
      const g0 = c.createRadialGradient(0, 0, 0, 0, 0, S * .4);
      g0.addColorStop(0, 'rgba(20,8,0,.55)'); g0.addColorStop(1, 'rgba(20,8,0,0)');
      c.fillStyle = g0; c.beginPath(); c.arc(0, 0, S * .4, 0, 6.283); c.fill(); c.restore();

      c = bd.getContext('2d');
      const cy = S * .56, ry = S * .31;
      [-2, 2, -1, 1, 0].forEach(i => {
        const cx = S / 2 + i * S * .115, rx = S * (.215 - Math.abs(i) * .012);
        const g = c.createLinearGradient(cx - rx, 0, cx + rx, 0);
        g.addColorStop(0, '#b24607'); g.addColorStop(.28, '#ee8419'); g.addColorStop(.5, '#ffb347');
        g.addColorStop(.72, '#ee8419'); g.addColorStop(1, '#a93f05');
        c.beginPath(); c.ellipse(cx, cy, rx, ry - Math.abs(i) * S * .012, 0, 0, 6.283);
        c.fillStyle = g; c.fill();
        c.lineWidth = 3; c.strokeStyle = 'rgba(110,40,0,.55)'; c.stroke();
      });

      c = stm.getContext('2d');
      const sx = S / 2, top = S * .13, base = S * .3;
      c.beginPath();
      c.moveTo(sx - 26, base); c.quadraticCurveTo(sx - 20, S * .2, sx - 6, top);
      c.lineTo(sx + 20, top + 6); c.quadraticCurveTo(sx + 16, S * .21, sx + 28, base);
      c.closePath();
      const gs = c.createLinearGradient(sx - 28, 0, sx + 28, 0);
      gs.addColorStop(0, '#4d6320'); gs.addColorStop(.5, '#7d9a3a'); gs.addColorStop(1, '#46591b');
      c.fillStyle = gs; c.fill(); c.lineWidth = 2; c.strokeStyle = '#2e3a10'; c.stroke();
      return { sh, stm, bd };
    }

    /* farthest-point sampling */
    function farSeeds(list, k) {
      const seeds = [];
      for (let n = 0; n < k; n++) {
        let best = null, bd = -1;
        const tries = n ? 10 : 1;
        for (let t = 0; t < tries; t++) {
          const i = list[(Math.random() * list.length) | 0], x = i % S, y = (i / S) | 0;
          let md = 1e9;
          for (const s of seeds) md = Math.min(md, Math.hypot(x - s[0], y - s[1]));
          if (md > bd || !best) { bd = md; best = [x, y]; }
        }
        seeds.push(best);
      }
      return seeds;
    }

    /* ---------- build ---------- */
    function build() {
      if (!buildP) {
        buildP = Promise.all([IMG_SHADOW, IMG_STEM].concat(IMG_PIECES).map(loadImg)).then(r => {
          let sh = r[0], stm = r[1], pcs = r.slice(2);
          if (!pcs.some(Boolean)) {                         // no usable pumpkin picture -> draw one
            const f = fallbackPumpkin();
            sh = f.sh; stm = f.stm; pcs = [f.bd];
            stage.style.setProperty('--ps', 'url(' + f.sh.toDataURL() + ')');
            stage.style.setProperty('--pst', 'url(' + f.stm.toDataURL() + ')');
          }
          construct(sh, stm, pcs);
          built = true;
        }).catch(e => { console.error('[pumpkin] build failed:', e); });
      }
      return buildP;
    }

    function construct(sh, stm, pcs) {
      const N = S * S;
      body = document.createElement('canvas'); body.width = body.height = S; body.className = 'pbody';
      bctx = body.getContext('2d', { willReadFrequently: true });
      pcs.forEach(im => { if (im) bctx.drawImage(im, 0, 0, S, S); });
      srcData = bctx.getImageData(0, 0, S, S);
      const A = srcData.data;

      const tmp = document.createElement('canvas'); tmp.width = tmp.height = S;
      const t = tmp.getContext('2d', { willReadFrequently: true });
      stemA = new Uint8Array(N);
      let x0 = S, x1 = 0, y1 = 0;
      if (stm) {
        t.drawImage(stm, 0, 0, S, S);
        const d = t.getImageData(0, 0, S, S).data;
        for (let i = 0; i < N; i++) {
          const a = d[i * 4 + 3]; stemA[i] = a;
          if (a > 40) { const x = i % S, y = (i / S) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y > y1) y1 = y; }
        }
      }
      if (x1 >= x0) stemOrigin = (((x0 + x1) / 2 / S) * 100).toFixed(1) + '% ' + ((y1 / S) * 100).toFixed(1) + '%';
      if (sh) {
        t.clearRect(0, 0, S, S); t.drawImage(sh, 0, 0, S, S);
        const d = t.getImageData(0, 0, S, S).data;
        let sa = 0, sy = 0;
        for (let i = 0; i < N; i++) { const a = d[i * 4 + 3]; if (a) { sa += a; sy += a * ((i / S) | 0); } }
        if (sa > 0) shadowG = clamp(sy / sa / S, .55, .97);
      }
      stemEl.style.transformOrigin = stemOrigin;

      op = new Uint8Array(N); opIdx = [];
      let sx = 0, sy2 = 0;
      for (let i = 0; i < N; i++) if (A[i * 4 + 3] > 0) { op[i] = 1; opIdx.push(i); sx += i % S; sy2 += (i / S) | 0; }
      if (opIdx.length < 100) throw new Error('pumpkin picture has no visible pixels');
      totalArea = Math.max(1, opIdx.length); pcx = sx / totalArea; pcy = sy2 / totalArea;

      const wx = new Float32Array(N), wy = new Float32Array(N), fx = new Float32Array(N), fy = new Float32Array(N);
      const P = []; for (let i = 0; i < 12; i++) P.push(Math.random() * 6.283);
      for (const k of opIdx) {
        const x = k % S, y = (k / S) | 0;
        wx[k] = x + 18 * Math.sin(y * .021 + P[0]) + 11 * Math.sin((x + y) * .017 + P[1]) + 5 * Math.sin(y * .05 + x * .03 + P[2]);
        wy[k] = y + 18 * Math.sin(x * .019 + P[3]) + 11 * Math.sin((x - y) * .018 + P[4]) + 5 * Math.sin(x * .05 - y * .03 + P[5]);
        fx[k] = x + 6 * Math.sin(y * .11 + P[6] + Math.sin(x * .07 + P[7]) * 2) + 3.5 * Math.sin((x + 2 * y) * .19 + P[8]);
        fy[k] = y + 6 * Math.sin(x * .10 + P[9] + Math.sin(y * .08 + P[10]) * 2) + 3.5 * Math.sin((2 * x - y) * .21 + P[11]);
      }

      label = new Uint8Array(N).fill(255);
      for (let attempt = 0; attempt < 14; attempt++) {
        const seeds = farSeeds(opIdx, 5), counts = [0, 0, 0, 0, 0];
        for (const k of opIdx) {
          const X = wx[k], Y = wy[k]; let b = 0, bd = 1e12;
          for (let s = 0; s < 5; s++) { const dx = X - seeds[s][0], dy = Y - seeds[s][1], d = dx * dx + dy * dy; if (d < bd) { bd = d; b = s; } }
          label[k] = b; counts[b]++;
        }
        if (Math.min.apply(null, counts) >= totalArea * .11) break;
      }
      regPix = [[], [], [], [], []];
      const sxs = [0, 0, 0, 0, 0], sys = [0, 0, 0, 0, 0];
      for (const k of opIdx) { const r = label[k]; regPix[r].push(k); sxs[r] += k % S; sys[r] += (k / S) | 0; }
      for (let r = 0; r < 5; r++) {
        if (!regPix[r].length) { regPix[r].push(opIdx[(Math.random() * opIdx.length) | 0]); }
        const n = Math.max(1, regPix[r].length);
        regArea[r] = regPix[r].length;
        regCent[r] = [sxs[r] / n, sys[r] / n];
        let bd = 1e12, bk = regPix[r][0] || 0;
        for (const k of regPix[r]) { const dx = k % S - regCent[r][0], dy = ((k / S) | 0) - regCent[r][1], d = dx * dx + dy * dy; if (d < bd) { bd = d; bk = k; } }
        regSeed[r] = [bk % S, (bk / S) | 0];
      }

      chunks = []; chunkId = new Uint16Array(N);
      for (let r = 0; r < 5; r++) {
        const list = regPix[r], kk = 4 + ((Math.random() * 3) | 0);
        const cs = farSeeds(list, kk), base = chunks.length;
        for (let c = 0; c < kk; c++) chunks.push({ region: r, n: 0, minx: S, miny: S, maxx: 0, maxy: 0, sx: 0, sy: 0, cv: null, img: null, w: 0, h: 0 });
        for (const k of list) {
          const X = fx[k], Y = fy[k]; let b = 0, bd = 1e12;
          for (let c = 0; c < kk; c++) { const dx = X - cs[c][0], dy = Y - cs[c][1], d = dx * dx + dy * dy; if (d < bd) { bd = d; b = c; } }
          chunkId[k] = base + b;
          const m = chunks[base + b], x = k % S, y = (k / S) | 0;
          m.n++; m.sx += x; m.sy += y;
          if (x < m.minx) m.minx = x; if (x > m.maxx) m.maxx = x; if (y < m.miny) m.miny = y; if (y > m.maxy) m.maxy = y;
        }
      }

      const fd = new Uint8Array(N).fill(255);
      for (const k of opIdx) {
        const x = k % S, y = (k / S) | 0, id = chunkId[k];
        if ((x > 0 && op[k - 1] && chunkId[k - 1] !== id) || (x < S - 1 && op[k + 1] && chunkId[k + 1] !== id) ||
            (y > 0 && op[k - S] && chunkId[k - S] !== id) || (y < S - 1 && op[k + S] && chunkId[k + S] !== id)) fd[k] = 0;
      }
      for (let lev = 1; lev < 3; lev++) {
        for (const k of opIdx) {
          if (fd[k] !== 255) continue;
          const x = k % S, y = (k / S) | 0, id = chunkId[k], l = lev - 1;
          if ((x > 0 && fd[k - 1] === l && chunkId[k - 1] === id) || (x < S - 1 && fd[k + 1] === l && chunkId[k + 1] === id) ||
              (y > 0 && fd[k - S] === l && chunkId[k - S] === id) || (y < S - 1 && fd[k + S] === l && chunkId[k + S] === id)) fd[k] = lev;
        }
      }

      for (const m of chunks) if (m.n) { m.w = m.maxx - m.minx + 1; m.h = m.maxy - m.miny + 1; m.img = new ImageData(m.w, m.h); }
      for (const k of opIdx) {
        const m = chunks[chunkId[k]], x = k % S, y = (k / S) | 0, o = ((y - m.miny) * m.w + (x - m.minx)) * 4, s = k * 4, d = m.img.data;
        let r = A[s], g = A[s + 1], b = A[s + 2];
        const l = fd[k];
        if (l < 3) { const tt = RIM[l]; r += (FR - r) * tt; g += (FG - g) * tt; b += (FB - b) * tt; }
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = A[s + 3];
      }
      for (const m of chunks) {
        if (!m.n) continue;
        const cv = document.createElement('canvas'); cv.width = m.w; cv.height = m.h; cv.className = 'pchunk';
        cv.getContext('2d').putImageData(m.img, 0, 0);
        m.cv = cv; m.img = null;
      }

      goneA = new Uint8Array(N); rdA = new Uint8Array(N);
      ccv = document.createElement('canvas'); ccv.width = ccv.height = S; ccv.className = 'pcrack';
      cc = ccv.getContext('2d');
      stage.appendChild(body); stage.appendChild(ccv);
      renderBody();
    }

    function renderBody() {
      const d = new Uint8ClampedArray(srcData.data);
      for (const k of opIdx) { if (removed[label[k]]) { goneA[k] = 1; d[k * 4 + 3] = 0; } else goneA[k] = 0; rdA[k] = 255; }
      for (const k of opIdx) {
        if (goneA[k]) continue;
        const x = k % S, y = (k / S) | 0;
        if ((x > 0 && goneA[k - 1]) || (x < S - 1 && goneA[k + 1]) || (y > 0 && goneA[k - S]) || (y < S - 1 && goneA[k + S])) rdA[k] = 0;
      }
      for (let lev = 1; lev < 3; lev++) {
        for (const k of opIdx) {
          if (goneA[k] || rdA[k] !== 255) continue;
          const x = k % S, y = (k / S) | 0, l = lev - 1;
          if ((x > 0 && rdA[k - 1] === l) || (x < S - 1 && rdA[k + 1] === l) || (y > 0 && rdA[k - S] === l) || (y < S - 1 && rdA[k + S] === l)) rdA[k] = lev;
        }
      }
      for (const k of opIdx) {
        const l = rdA[k];
        if (l < 3 && !goneA[k]) { const s = k * 4, tt = RIM[l]; d[s] += (FR - d[s]) * tt; d[s + 1] += (FG - d[s + 1]) * tt; d[s + 2] += (FB - d[s + 2]) * tt; }
      }
      bctx.putImageData(new ImageData(d, S, S), 0, 0);
    }

    function updateShadow() {
      let rem = 0;
      for (let r = 0; r < 5; r++) if (!removed[r]) rem += regArea[r];
      shadowEl.style.opacity = (.32 + .68 * rem / totalArea).toFixed(3);
    }

    /* ---------- cracks ---------- */
    function startCrack(id, ox, oy) {
      cracking.add(id);
      if (rm) { finish(id, ox, oy); return; }
      const bp = [];
      for (const k of regPix[id]) {
        const x = k % S, y = (k / S) | 0;
        let edge = false, n;
        if (x > 0) { n = k - 1; if (op[n] && label[n] !== id && !removed[label[n]]) edge = true; }
        if (!edge && x < S - 1) { n = k + 1; if (op[n] && label[n] !== id && !removed[label[n]]) edge = true; }
        if (!edge && y > 0) { n = k - S; if (op[n] && label[n] !== id && !removed[label[n]]) edge = true; }
        if (!edge && y < S - 1) { n = k + S; if (op[n] && label[n] !== id && !removed[label[n]]) edge = true; }
        if (edge) bp.push([x, y, Math.hypot(x - ox, y - oy)]);
      }
      bp.sort((a, b) => a[2] - b[2]);
      const maxD = bp.length ? Math.max(1, bp[bp.length - 1][2]) : 1;

      const lines = [], nl = 4 + ((Math.random() * 3) | 0);
      for (let l = 0; l < nl; l++) {
        let tx, ty;
        if (bp.length > 30) { const q = bp[(Math.random() * bp.length) | 0]; tx = q[0]; ty = q[1]; }
        else { const k = regPix[id][(Math.random() * regPix[id].length) | 0]; tx = k % S; ty = (k / S) | 0; }
        const dist = Math.hypot(tx - ox, ty - oy);
        if (dist < 20) continue;
        const steps = Math.max(4, (dist / 7) | 0), nx = -(ty - oy) / dist, ny = (tx - ox) / dist;
        const pts = [[ox, oy]]; let off = 0;
        for (let s = 1; s <= steps; s++) {
          const f = s / steps;
          off = (off + rnd(-5, 5)) * .8; if (f === 1) off = 0;
          const jx = ox + (tx - ox) * f + nx * off, jy = oy + (ty - oy) * f + ny * off;
          const ix = jx | 0, iy = jy | 0;
          if (ix < 0 || iy < 0 || ix >= S || iy >= S || !op[iy * S + ix]) break;
          pts.push([jx, jy]);
        }
        if (pts.length > 1) lines.push(pts);
      }
      activeCracks.push({ id, ox, oy, bp, maxD, lines, t0: performance.now(), dur: 200, hold: 70 });
      if (!crackRaf) crackRaf = requestAnimationFrame(crackLoop);
    }

    function drawCrack(c, p) {
      const q = 1 - (1 - p) * (1 - p), lim = q * c.maxD;
      cc.fillStyle = 'rgba(255,226,170,.42)';
      for (const b of c.bp) { if (b[2] > lim) break; cc.fillRect(b[0] + 1, b[1] + 1.3, 1.4, 1.4); }
      cc.fillStyle = 'rgba(38,12,2,.93)';
      for (const b of c.bp) { if (b[2] > lim) break; cc.fillRect(b[0] - 1, b[1] - 1, 2.6, 2.6); }
      cc.lineCap = 'round'; cc.lineJoin = 'round';
      for (const line of c.lines) {
        const n = Math.max(1, Math.floor((line.length - 1) * q));
        cc.beginPath(); cc.moveTo(line[0][0] + 1.3, line[0][1] + 1.3);
        for (let i = 1; i <= n; i++) cc.lineTo(line[i][0] + 1.3, line[i][1] + 1.3);
        cc.strokeStyle = 'rgba(255,225,165,.45)'; cc.lineWidth = 1.3; cc.stroke();
        cc.beginPath(); cc.moveTo(line[0][0], line[0][1]);
        for (let i = 1; i <= n; i++) cc.lineTo(line[i][0], line[i][1]);
        cc.strokeStyle = 'rgba(36,12,2,.95)'; cc.lineWidth = 2.6; cc.stroke();
      }
    }

    function crackLoop(now) {
      crackRaf = 0;
      cc.clearRect(0, 0, S, S);
      let shaking = false;
      for (let a = activeCracks.length - 1; a >= 0; a--) {
        const c = activeCracks[a], t = now - c.t0, p = Math.min(1, t / c.dur);
        if (t >= c.dur + c.hold) { activeCracks.splice(a, 1); finish(c.id, c.ox, c.oy); continue; }
        drawCrack(c, p); shaking = true;
      }
      cc.globalCompositeOperation = 'destination-in'; cc.drawImage(body, 0, 0); cc.globalCompositeOperation = 'source-over';
      if (activeCracks.length) {
        crackRaf = requestAnimationFrame(crackLoop);
        stage.style.transform = shaking ? 'translate(' + rnd(-1.4, 1.4).toFixed(2) + 'px,' + rnd(-1.4, 1.4).toFixed(2) + 'px)' : '';
      } else { cc.clearRect(0, 0, S, S); stage.style.transform = ''; }
    }

    /* ---------- the region lets go ---------- */
    function finish(id, ox, oy) {
      cracking.delete(id); removed[id] = 1;
      renderBody(); updateShadow();
      if (!rm) {
        spawnChunks(id, ox, oy); spawnParticles(id);
        stage.animate([{ transform: 'translate(0,0) rotate(0)' },
          { transform: 'translate(' + rnd(-5, 5).toFixed(1) + 'px,3px) rotate(' + rnd(-.6, .6).toFixed(2) + 'deg)', offset: .25 },
          { transform: 'translate(' + rnd(-3, 3).toFixed(1) + 'px,-1.5px)', offset: .55 },
          { transform: 'translate(0,0) rotate(0)' }], { duration: 380, easing: 'ease-out' });
        stemEl.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(' + (Math.random() < .5 ? -2.4 : 2.4) + 'deg)', offset: .3 }, { transform: 'rotate(' + (Math.random() < .5 ? -.8 : .8) + 'deg)', offset: .65 }, { transform: 'rotate(0)' }], { duration: 520, easing: 'ease-out' });
      }
      if (removed.every(Boolean)) win();
    }

    function spawnChunks(id, ox, oy) {
      const r = stage.getBoundingClientRect(), size = r.width, k = size / S;
      curSize = size;
      for (const m of chunks) {
        if (m.region !== id || !m.n) continue;
        const el = m.cv, cx = m.sx / m.n, cy = m.sy / m.n;
        el.style.left = (m.minx / S * 100) + '%'; el.style.top = (m.miny / S * 100) + '%';
        el.style.width = (m.w / S * 100) + '%'; el.style.height = (m.h / S * 100) + '%';
        el.style.transformOrigin = ((cx - m.minx) / m.w * 100) + '% ' + ((cy - m.miny) / m.h * 100) + '%';
        stage.appendChild(el);
        let ax = (cx - ox) * .6 + (cx - pcx) * .4, ay = (cy - oy) * .6 + (cy - pcy) * .4;
        ax += rnd(-20, 20); ay += rnd(-20, 20);
        const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
        const sf = clamp(1.25 - (m.n / totalArea) * 3, .55, 1.1), sp = size * rnd(.35, .8) * sf;
        const hh = m.h * k / 2, cyp = cy * k;
        bodies.push({
          el, x: 0, y: 0, rot: 0, cy: cyp, hh,
          vx: ax * sp, vy: ay * sp * .6 - size * rnd(.15, .45),
          w: (Math.random() < .5 ? -1 : 1) * rnd(140, 520),
          g: Math.max(shadowG * size + rnd(-.015, .05) * size, cyp + hh * .8 + size * .035),
          bn: 0, ground: false, t: 0
        });
      }
      ensureLoop();
    }

    function spawnParticles(id) {
      const r = stage.getBoundingClientRect(), size = r.width, k = size / S;
      curSize = size;
      const list = regPix[id], frac = regArea[id] / totalArea, gBase = r.top + shadowG * size;
      const mk = type => {
        const q = list[(Math.random() * list.length) | 0], px = q % S, py = (q / S) | 0;
        let dx = px - pcx, dy = py - pcy; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
        const sp = size * rnd(.3, 1.05), u = size / 440;
        return {
          type, x: r.left + px * k, y: r.top + py * k,
          vx: (dx * .7 + rnd(-.6, .6)) * sp, vy: (dy * .4 - rnd(.2, .9)) * sp,
          r: type === 'seed' ? rnd(2.4, 3.6) * u : rnd(1.8, 5.2) * u,
          rot: rnd(0, 6.283), w: rnd(-12, 12),
          col: PULP[(Math.random() * PULP.length) | 0], g: gBase + rnd(-.01, .07) * size,
          bn: 0, land: 0, a: 1, t: 0
        };
      };
      const nSeed = Math.round(8 + frac * 30), nPulp = Math.round(16 + frac * 60), nStr = Math.round(5 + frac * 24);
      for (let i = 0; i < nSeed; i++) parts.push(mk('seed'));
      for (let i = 0; i < nPulp; i++) parts.push(mk('pulp'));
      for (let i = 0; i < nStr; i++) parts.push(mk('streak'));
      ensureLoop();
    }

    /* ---------- animation loop ---------- */
    function ensureLoop() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }

    function tick(now) {
      raf = 0;
      const dt = Math.min(.033, Math.max(.001, (now - last) / 1000)); last = now;
      const gr = curSize * 3.6;

      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        if (!b.ground) {
          b.vy += gr * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.w * dt;
          if (b.vy > 0 && b.cy + b.y + b.hh * .8 >= b.g) {
            b.y = b.g - b.hh * .8 - b.cy;
            if (b.bn < 2 && b.vy > curSize * .55) { b.vy *= -rnd(.26, .42); b.vx *= .7; b.w *= -.55; b.bn++; }
            else { b.vy = 0; b.ground = true; b.t = 0; }
          }
        } else {
          b.x += b.vx * dt; b.vx *= Math.exp(-5 * dt); b.rot += b.w * dt; b.w *= Math.exp(-7 * dt); b.t += dt;
          if (b.t > .3) {
            const f = 1 - (b.t - .3) / .5;
            if (f <= 0) { b.el.remove(); bodies.splice(i, 1); continue; }
            b.el.style.opacity = f.toFixed(3);
          }
        }
        b.el.style.transform = 'translate(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px) rotate(' + b.rot.toFixed(1) + 'deg)';
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (!p.land) {
          p.vy += gr * dt; if (p.type !== 'seed') p.vx *= Math.exp(-.5 * dt);
          p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.w * dt;
          if (p.vy > 0 && p.y >= p.g) {
            p.y = p.g;
            if (p.type === 'seed' && p.bn < 2 && p.vy > curSize * .4) { p.vy *= -.35; p.vx *= .6; p.bn++; }
            else { p.land = 1; p.t = 0; p.vx = 0; p.vy = 0; p.w = 0; }
          }
        } else {
          p.t += dt;
          const delay = p.type === 'seed' ? .8 : .25;
          if (p.t > delay) p.a -= dt / (p.type === 'seed' ? .6 : 1.2);
          if (p.a <= 0) { parts.splice(i, 1); continue; }
        }
      }
      pctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        pctx.globalAlpha = clamp(p.a, 0, 1);
        if (p.type === 'seed') {
          pctx.save(); pctx.translate(p.x, p.y); pctx.rotate(p.rot);
          pctx.beginPath(); pctx.ellipse(0, 0, p.r * 1.8, p.r * .95, 0, 0, 6.283);
          pctx.fillStyle = '#f3e1ac'; pctx.fill(); pctx.lineWidth = .8; pctx.strokeStyle = 'rgba(140,95,40,.75)'; pctx.stroke();
          pctx.restore();
        } else if (p.land) {
          pctx.beginPath(); pctx.ellipse(p.x, p.y, p.r * 2.3, p.r * .5, 0, 0, 6.283); pctx.fillStyle = p.col; pctx.fill();
        } else if (p.type === 'streak') {
          pctx.beginPath(); pctx.moveTo(p.x, p.y); pctx.lineTo(p.x - p.vx * .03, p.y - p.vy * .03);
          pctx.lineWidth = p.r * 1.1; pctx.lineCap = 'round'; pctx.strokeStyle = p.col; pctx.stroke();
        } else {
          pctx.beginPath(); pctx.arc(p.x, p.y, p.r, 0, 6.283); pctx.fillStyle = p.col; pctx.fill();
        }
      }
      pctx.globalAlpha = 1;

      if (bodies.length || parts.length) raf = requestAnimationFrame(tick);
      else pctx.clearRect(0, 0, innerWidth, innerHeight);
    }

    /* ---------- tapping ---------- */
    sec.addEventListener('pointerdown', e => {
      if (!ready || won || !built || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      const px = Math.round((e.clientX - r.left) / r.width * S), py = Math.round((e.clientY - r.top) / r.height * S);
      if (px < 0 || py < 0 || px >= S || py >= S) return;
      const i = py * S + px;
      if (!(op[i] || stemA[i] > 20)) return;
      const alive = id => !removed[id] && !cracking.has(id);
      let id = -1;
      if (BREAK_UNDER_FINGER && op[i] && alive(label[i])) id = label[i];
      if (id < 0) {
        const cand = [0, 1, 2, 3, 4].filter(alive);
        if (!cand.length) return;
        if (BREAK_UNDER_FINGER) {
          let best = 1e12;
          cand.forEach(c => { const d = Math.hypot(regCent[c][0] - px, regCent[c][1] - py); if (d < best) { best = d; id = c; } });
        } else id = cand[(Math.random() * cand.length) | 0];
      }
      hint.classList.add('hide');
      const inside = op[i] && label[i] === id;
      startCrack(id, inside ? px : regSeed[id][0], inside ? py : regSeed[id][1]);
    });

    /* ---------- all broken -> next scene ---------- */
    function win() {
      won = true; ready = false;
      setTimeout(() => {
        sec.classList.add('exit');
        setTimeout(() => { sec.classList.add('gone'); pfx.remove(); }, rm ? 0 : 1100);
        setTimeout(() => { scene.classList.add('show'); }, rm ? 0 : 500);
      }, rm ? 0 : 1700);
    }

    /* ---------- hand-over: prize shown -> wait -> scratch card out, pumpkin in ---------- */
    function start() {
      if (starting || sec.classList.contains('show')) return;
      starting = true;
      if (scratchEl) scratchEl.classList.add('out');
      if (coinEl) coinEl.classList.add('gone');
      build().then(() => {
        if (!built) {                                    // build failed: do not leave the page stuck
          console.warn('[pumpkin] skipping pumpkin, showing next scene');
          won = true; scene.classList.add('show'); pfx.remove();
          return;
        }
        sec.classList.add('show');
        setTimeout(() => { ready = true; }, rm ? 0 : 1900);
      });
    }
    function arm() {
      if (started || !scratchEl || !scratchEl.classList.contains('cleared')) return;
      started = true;
      setTimeout(build, 60);
      setTimeout(start, rm ? 0 : WAIT_MS);
    }
    if (scratchEl) new MutationObserver(arm).observe(scratchEl, { attributes: true, attributeFilter: ['class'] });
    setInterval(arm, 300);
    window.startPumpkin = start;                         // test: type startPumpkin() in the browser console
  };

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', run);
  else run();
})();
