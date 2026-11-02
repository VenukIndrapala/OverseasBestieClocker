'use strict';
/* =====================================================================
   Pumpkin add-on  (load AFTER letter.js)
   ---------------------------------------------------------------------
   1. when the prize is revealed (#scratch gets "cleared") wait 5 seconds
   2. the scratch card slides up and out, the coin fades, the pumpkin slides in from the bottom
   3. THREE BOXES under the pumpkin: tick all three to unlock the hammer (on the right)
   4. DRAG the hammer and DROP it on the pumpkin. Only the piece you drop it on breaks.
      Do this on five different pieces. A drop on empty space / a broken piece springs back.
   5. when the 5th piece has fallen the closed envelope (hidden inside the pumpkin all along) opens where it sits,
      enlarges to the middle of the screen, hearts rise from its bottom edge and the letter slides out.
      The stem slides off to the right at the same time. A 'pumpkin:done' event fires when the letter is out.

   If IMG_SHADOW / IMG_STEM / IMG_PIECES are empty the script draws its own pumpkin.
   Paste your own picture data into the three constants below to use your pictures.
   ===================================================================== */
(() => {
  const run = () => {
    const WAIT_MS = 5000;
    const S = 600;
    const rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const HX = .65, HY = .39;               // where the centre of the hammer HEAD is inside the hammer picture (the drop point)
    const HAMMER_SRC = 'mallet.png';        // <- your transparent mallet picture, saved in the SAME folder as your index.html on GitHub

    /* the love letter that hides inside the pumpkin (your letter animation, rebuilt here with "lt-" class names
       so it can not clash with anything else on the page - you do NOT need love letter.css / .js / .html any more) */
    const LETTER_HTML =
      '<div class="lt" id="plt"><div class="lt-valentines"><div class="lt-env">' +
        '<div class="lt-back"></div>' +
        '<div class="lt-paper"><div class="lt-text">To my<br>Crush<br>I love You!</div><div class="lt-heart"></div></div>' +
        '<div class="lt-front"><svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true">' +
          '<path d="M0 0 L150 112 L0 200 Z" fill="#f3dcae"/><path d="M300 0 L150 112 L300 200 Z" fill="#eed3a0"/><path d="M0 200 L150 112 L300 200 Z" fill="#f8e7c6"/>' +
          '<path d="M0 0 L150 112 L300 0 M0 200 L150 112 L300 200" fill="none" stroke="rgba(150,100,40,.28)" stroke-width="1.2"/></svg></div>' +
        '<div class="lt-flap">' +
          '<div class="face"><svg viewBox="0 0 300 112" aria-hidden="true"><defs><linearGradient id="ltg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dba9"/><stop offset="1" stop-color="#ecc98a"/></linearGradient></defs>' +
            '<path d="M0 0 L300 0 L166 104 Q150 117 134 104 Z" fill="url(#ltg1)" stroke="rgba(150,100,40,.35)" stroke-width="1.2" stroke-linejoin="round"/>' +
            '<circle cx="150" cy="86" r="16" fill="#c0392b"/><circle cx="150" cy="86" r="16" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/>' +
            '<path d="M150 96 L141 87 A4.8 4.8 0 0 1 150 81 A4.8 4.8 0 0 1 159 87 Z" fill="#ffd9d0"/></svg></div>' +
          '<div class="face in"><svg viewBox="0 0 300 112" aria-hidden="true">' +
            '<path d="M0 0 L300 0 L166 104 Q150 117 134 104 Z" fill="#e4c183" stroke="rgba(150,100,40,.35)" stroke-width="1.2" stroke-linejoin="round"/>' +
            '<path d="M14 5 L286 5 L164 96 Q150 106 136 96 Z" fill="#ecd09c"/></svg></div>' +
        '</div>' +
      '</div><div class="lt-hearts"></div></div><div class="lt-shadow"></div></div>';

    /* ---------------------------------------------------------------
       PASTE YOUR PICTURE DATA HERE (data-URIs or file paths).
       --------------------------------------------------------------- */
    const IMG_SHADOW = '';
    const IMG_STEM = '';
    const IMG_PIECES = ['', '', '', '', ''];
    /* --------------------------------------------------------------- */

    const rnd = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const HAMMER_SVG =
      '<svg viewBox="0 0 740 660" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;overflow:visible">' +
      '<defs>' +
      '<linearGradient id="phH" gradientUnits="userSpaceOnUse" x1="250" y1="130" x2="640" y2="440">' +
      '<stop offset="0" stop-color="#e03a1c"/><stop offset=".08" stop-color="#d40000"/><stop offset=".15" stop-color="#ad1800"/>' +
      '<stop offset=".22" stop-color="#e6381b"/><stop offset=".30" stop-color="#d90000"/><stop offset=".62" stop-color="#d90000"/>' +
      '<stop offset=".70" stop-color="#e6381b"/><stop offset=".78" stop-color="#ad1800"/><stop offset=".85" stop-color="#d40000"/>' +
      '<stop offset=".92" stop-color="#e6381b"/><stop offset="1" stop-color="#c63a1c"/></linearGradient>' +
      '<linearGradient id="phG" gradientUnits="userSpaceOnUse" x1="110" y1="620" x2="420" y2="330">' +
      '<stop offset="0" stop-color="#fcd22c"/><stop offset=".25" stop-color="#e3b41d"/><stop offset="1" stop-color="#fcd22c"/></linearGradient>' +
      '</defs>' +
      '<polygon points="380,312 426,353 132,628 116,626 108,606" fill="url(#phG)"/>' +
      '<polygon points="393,30 418,40 519,121 523,152 598,192 615,216 695,312 706,343 560,488 534,480 432,396 425,366 338,300 255,198 248,176" fill="url(#phH)"/>' +
      '<polygon points="380,312 395,312 426,350 418,362 405,350" fill="#e0b21c"/>' +
      '<polygon points="549,138 598,188 596,196 575,215 521,158 522,152" fill="#fcc82b"/>' +
      '<polygon points="549,138 598,188 596,196 560,160" fill="#f29a2a"/>' +
      '</svg>';

    /* ---------- styles ---------- */
    const st = document.createElement('style');
    st.textContent = `
    .scratch.out .swrap{translate:0 -125vh;transition:translate .95s cubic-bezier(.65,0,.35,1)}
    .coin.free.gone{opacity:0;pointer-events:none;transition:opacity .4s,scale .5s}

    .pumpkin{--sw:min(440px,64vw,52vh);position:fixed;inset:0;z-index:600;display:grid;place-items:center;visibility:hidden;pointer-events:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
    .pumpkin.show{visibility:visible;pointer-events:auto}
    .pslide{position:relative;width:var(--sw);display:flex;flex-direction:column;align-items:center;gap:16px;translate:0 115vh;transition:translate 1.05s cubic-bezier(.22,1,.36,1) .8s}
    .pumpkin.show .pslide{translate:0 0}
    .pstage{position:relative;width:var(--sw);aspect-ratio:1}
    .pshadow,.pstem,.pbody,.pcrack{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
    .pshadow{background:var(--ps) center/100% 100% no-repeat;transition:opacity .9s ease}
    .pstem{background:var(--pst) center/100% 100% no-repeat}
    .pchunk{position:absolute;pointer-events:none;will-change:transform,opacity;filter:drop-shadow(0 5px 4px rgba(30,12,2,.4))}
    .pfx{position:fixed;inset:0;width:100%;height:100%;z-index:610;pointer-events:none}
    .phint{margin:0;min-height:1.4em;max-width:100%;text-align:center;font:500 15px var(--font,system-ui,sans-serif);color:var(--ink2,#6b5a4a);opacity:0;transition:opacity .5s 1.8s}
    .pumpkin.show .phint{opacity:1}

    /* the three boxes */
    .pboxes{display:flex;gap:14px}
    .pbox{appearance:none;-webkit-appearance:none;position:relative;width:40px;height:40px;padding:0;border-radius:10px;border:3px solid #d9822b;background:rgba(255,255,255,.78);cursor:pointer;transition:background .2s,border-color .2s,transform .15s}
    .pbox:active{transform:scale(.92)}
    .pbox.on{background:#f28a1d;border-color:#c9540a}
    .pbox.on::after{content:'';position:absolute;left:12px;top:4px;width:10px;height:20px;border:solid #fff;border-width:0 4px 4px 0;transform:rotate(45deg)}

    /* the hammer */
    .phwrap{position:absolute;left:calc(100% + 2px);top:8%;width:min(120px,16vw);aspect-ratio:740/660;z-index:5;pointer-events:none;transition:opacity .5s}
    .phammer{position:absolute;inset:0;transform-origin:65% 39%;touch-action:none;pointer-events:none;filter:grayscale(1) opacity(.38);transition:filter .4s;will-change:transform}
    .phammer.unlocked{pointer-events:auto;cursor:grab;filter:none;animation:phwig .7s ease .1s 1}
    .phammer.drag{cursor:grabbing;filter:drop-shadow(0 10px 8px rgba(30,12,2,.35));z-index:20}
    .phimg{width:100%;height:100%;display:block;object-fit:contain;pointer-events:none;-webkit-user-drag:none;user-select:none}
    .phwrap.away{opacity:0}
    @keyframes phwig{0%,100%{transform:rotate(0)}20%{transform:rotate(-14deg)}45%{transform:rotate(11deg)}70%{transform:rotate(-6deg)}}

    /* ---- the letter (sits inside the pumpkin; its flap opens, it flies out + enlarges, hearts rise) ---- */
    .lt{position:absolute;left:50%;top:60%;width:300px;height:200px;pointer-events:none;transform-origin:center center;transform:translate(-50%,-50%) scale(var(--ls,.5))}
    .lt.fly{position:fixed;left:50%;top:50%;transition:transform 1.2s cubic-bezier(.22,1,.36,1)}
    .ltlayer{position:fixed;inset:0;z-index:605;pointer-events:none}
    .lt-valentines{position:relative;width:300px;height:200px}
    .lt.show .lt-valentines{animation:lt-up 3s ease-in-out infinite}
    @keyframes lt-up{0%,100%{transform:translateY(0)}50%{transform:translateY(-22px)}}
    .lt-env{position:relative;width:300px;height:200px;perspective:1400px}
    .lt-back{position:absolute;inset:0;border-radius:2px;background:linear-gradient(160deg,#f6dba9,#efd09a);box-shadow:0 14px 28px rgba(91,42,38,.22),inset 0 0 26px -8px rgba(150,100,40,.35)}
    .lt-paper{position:absolute;left:4.5%;right:4.5%;top:0;height:80%;z-index:0;background:linear-gradient(#f2e1c8,#f8ead6 16%,#f7e9d4);box-shadow:inset 0 8px 10px -6px rgba(140,95,40,.38);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;transition:translate .9s cubic-bezier(.22,1,.36,1)}
    .lt-paper:before{content:"";position:absolute;inset:9px;border:2px dotted rgba(0,48,73,.4);pointer-events:none}
    .lt.out .lt-paper{z-index:1;translate:0 -58%}
    .lt-text{font:400 30px/1.05 "Brush Script MT","Lobster Two",cursive;color:#5B2A26;text-align:center;white-space:nowrap}
    .lt-heart{position:relative;width:20px;height:20px;background:#d62828;transform:rotate(-45deg);margin-top:4px}
    .lt-heart:before,.lt-heart:after{content:"";position:absolute;width:20px;height:20px;border-radius:60%;background:#d62828}
    .lt-heart:before{top:-10px;left:0}
    .lt-heart:after{left:10px;top:0}
    .lt-front{position:absolute;inset:0;z-index:2;border-radius:2px;overflow:hidden;pointer-events:none}
    .lt-front svg{display:block;width:100%;height:100%}
    .lt-flap{position:absolute;left:0;top:0;width:100%;height:56%;z-index:3;transform-origin:50% 0;transform-style:preserve-3d;pointer-events:none;will-change:transform}
    .lt-flap .face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
    .lt-flap .face svg{display:block;width:100%;height:100%;overflow:visible}
    .lt-flap .in{transform:rotateY(180deg)}
    .lt.openenv .lt-flap{animation:lt-flapSwing .9s cubic-bezier(.6,0,.4,1) both,lt-flapLayer .9s linear both}
    @keyframes lt-flapSwing{from{transform:rotateX(0deg)}to{transform:rotateX(-180deg)}}
    @keyframes lt-flapLayer{0%,49.9%{z-index:3}50%,100%{z-index:0}}
    /* five hearts rise from fixed positions along the envelope's bottom edge */
    .lt-hearts{position:absolute;left:0;top:0;width:300px;height:200px;z-index:6;pointer-events:none;opacity:0;transition:opacity .4s}
    .lt.show .lt-hearts{opacity:1}
    .lt-h{position:absolute;top:194px;width:16px;height:16px;background:var(--hc,#e63946);transform:rotate(-45deg);opacity:0;animation:lt-heart var(--hd,1.5s) ease-in-out var(--hl,0s) infinite;animation-play-state:paused}
    .lt.show .lt-h{animation-play-state:running}
    .lt-h:before,.lt-h:after{content:"";position:absolute;width:100%;height:100%;border-radius:50%;background:inherit}
    .lt-h:before{top:-50%;left:0}
    .lt-h:after{left:50%;top:0}
    @keyframes lt-heart{0%{transform:translateY(0) rotate(-45deg) scale(.3);opacity:1}100%{transform:translateY(-150px) rotate(-45deg) scale(1.3);opacity:.5}}
    .lt-shadow{position:absolute;width:330px;height:25px;border-radius:50%;background:rgba(0,0,0,.3);top:225px;left:-15px;opacity:0;transition:opacity .8s;animation:lt-scale 3s ease-in-out infinite;z-index:-1}
    .lt.show .lt-shadow{opacity:1}
    @keyframes lt-scale{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.85)}}
    @media(prefers-reduced-motion:reduce){.lt.openenv .lt-flap{animation:none;transform:rotateX(-180deg);z-index:0}.lt-paper{transition:none}}

    .pumpkin.exit{pointer-events:none}
    .pumpkin.exit .pslide{translate:125vw 0;transition:translate .95s cubic-bezier(.65,0,.35,1)}
    .pumpkin.gone{display:none}
    .pscene{position:fixed;inset:0;z-index:560;display:grid;place-items:center;visibility:hidden;pointer-events:none;text-align:center;padding:24px}
    .pscene.show{visibility:visible}
    .pscene h1{margin:0;font:700 clamp(34px,8vw,80px)/1.1 var(--font,system-ui,sans-serif);color:var(--ink,#3a2a1a);opacity:0;translate:0 26px;transition:opacity .7s .55s,translate .9s cubic-bezier(.22,1,.36,1) .55s}
    .pscene.show h1{opacity:1;translate:0 0}
    @media(prefers-reduced-motion:reduce){.pslide,.phint,.pshadow,.scratch.out .swrap,.pumpkin.exit .pslide,.pscene h1,.phwrap,.phammer,.lt,.lt-paper,.lt-hearts,.lt-shadow{transition:none;animation:none}.lt-valentines,.lt-h{animation:none!important}}
    `;
    document.head.appendChild(st);

    /* ---------- markup ---------- */
    const sec = document.createElement('section');
    sec.className = 'pumpkin'; sec.setAttribute('aria-label', 'Pumpkin. Tick the three boxes, then drag the hammer onto the pumpkin.');
    sec.innerHTML =
      '<div class="pslide">' +
        '<div class="pstage" id="pstage"><div class="pshadow" id="pshadow"></div>' + LETTER_HTML + '<div class="pstem" id="pstem"></div></div>' +
        '<div class="pboxes" id="pboxes">' +
          '<button type="button" class="pbox" role="checkbox" aria-checked="false" aria-label="Box 1"></button>' +
          '<button type="button" class="pbox" role="checkbox" aria-checked="false" aria-label="Box 2"></button>' +
          '<button type="button" class="pbox" role="checkbox" aria-checked="false" aria-label="Box 3"></button>' +
        '</div>' +
        '<p class="phint" id="phint">Tick all three boxes to unlock the hammer</p>' +
        '<div class="phwrap" id="phwrap"><div class="phammer" id="phammer" aria-label="Hammer"><img class="phimg" id="phimg" src="' + HAMMER_SRC + '" alt="" draggable="false"></div></div>' +
      '</div>';
    document.body.appendChild(sec);
    const scene = document.createElement('section');
    scene.className = 'pscene'; scene.setAttribute('aria-label', 'Next scene');
    scene.innerHTML = '<h1>Placeholder</h1>';
    document.body.appendChild(scene);

    const stage = sec.querySelector('#pstage'), shadowEl = sec.querySelector('#pshadow'),
          stemEl = sec.querySelector('#pstem'), hint = sec.querySelector('#phint'),
          boxes = Array.from(sec.querySelectorAll('.pbox')),
          hwrap = sec.querySelector('#phwrap'), ham = sec.querySelector('#phammer'),
          lt = sec.querySelector('#plt');
    /* mallet picture: match the box to the picture's shape; if the file is missing, fall back to the drawn mallet */
    const himg = sec.querySelector('#phimg');
    himg.addEventListener('load', () => { if (himg.naturalWidth && himg.naturalHeight) hwrap.style.aspectRatio = himg.naturalWidth + '/' + himg.naturalHeight; });
    himg.addEventListener('error', () => { console.warn('[pumpkin] ' + HAMMER_SRC + ' not found - using the drawn mallet. Check the file name / folder.'); ham.innerHTML = HAMMER_SVG; hwrap.style.aspectRatio = '740/660'; });
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

    /* ---------- the letter: closed envelope inside the pumpkin -> flap opens -> flies out + enlarges -> hearts rise ---------- */
    let flown = false, live = false, layer = null;
    const setLs = () => { if (!flown) lt.style.setProperty('--ls', (stage.clientWidth * .34 / 300).toFixed(4)); };   // size of the letter inside the pumpkin
    const finalScale = () => clamp(Math.min(innerWidth * .8 / 300, innerHeight * .58 / 330), .5, 1.8);
    const setLT = (dx, dy, s) => { lt.style.transform = 'translate(' + dx + 'px,' + dy + 'px) translate(-50%,-50%) scale(' + s + ')'; };
    const placeFinal = () => { const s = finalScale(); setLT(0, (20 * s).toFixed(1), s.toFixed(3)); };
    setLs(); addEventListener('resize', () => { if (!flown) setLs(); else if (live) { lt.style.transition = 'none'; placeFinal(); } });

    /* five hearts, fixed along the envelope and staggered like the reference animation */
    (() => {
      const box = lt.querySelector('.lt-hearts');
      const hearts = [
        { left: 35, duration: 1.0, delay: 0.0, color: '#e63946' },
        { left: 85, duration: 2.0, delay: 0.2, color: '#ff5d73' },
        { left: 135, duration: 1.5, delay: 0.4, color: '#d62828' },
        { left: 185, duration: 2.3, delay: 0.1, color: '#ff8fa3' },
        { left: 235, duration: 1.7, delay: 0.3, color: '#c1121f' }
      ];
      hearts.forEach(spec => {
        const h = document.createElement('i');
        h.className = 'lt-h';
        h.style.left = spec.left + 'px';
        h.style.setProperty('--hd', spec.duration + 's');
        h.style.setProperty('--hl', spec.delay + 's');
        h.style.setProperty('--hc', spec.color);
        box.appendChild(h);
      });
    })();

    /* step 1: take the letter out of the pumpkin WITHOUT moving it (so it stays when the pumpkin slides away) */
    function liftLetter() {
      if (flown) return; flown = true;
      const r = lt.getBoundingClientRect(), has = r.width > 0;
      const cx = has ? r.left + r.width / 2 : innerWidth / 2, cy = has ? r.top + r.height / 2 : innerHeight / 2, s0 = has ? r.width / 300 : finalScale();
      layer = document.createElement('div'); layer.className = 'ltlayer'; document.body.appendChild(layer);
      lt.style.transition = 'none';
      lt.classList.add('fly'); layer.appendChild(lt);
      setLT((cx - innerWidth / 2).toFixed(1), (cy - innerHeight / 2).toFixed(1), s0.toFixed(3));
      void lt.offsetWidth; lt.style.transition = '';
    }
    /* step 3: enlarge to the middle of the screen, then the hearts rise from the bottom of the envelope and the letter comes out */
    function enlargeLetter() {
      placeFinal();
      setTimeout(() => {
        live = true; lt.classList.add('show');
        setTimeout(() => { lt.classList.add('out'); document.dispatchEvent(new CustomEvent('pumpkin:done')); }, rm ? 0 : 500);
      }, rm ? 0 : 1250);
    }
    function showLetterNow() {                                         // used if the pumpkin could not be built
      liftLetter(); lt.classList.add('openenv');
      lt.style.transition = 'none'; placeFinal(); live = true; lt.classList.add('show');
      setTimeout(() => lt.classList.add('out'), rm ? 0 : 900);
    }

    /* ---------- state ---------- */
    let built = false, buildP = null, starting = false, started = false, ready = false, won = false;
    let unlocked = false, busy = false, drag = null, hintTimer = 0;
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
          if (!pcs.some(Boolean)) {
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
      updateHint();
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

    /* ---------- hint text ---------- */
    function updateHint() {
      const left = 5 - removed.filter(Boolean).length;
      if (won) { hint.textContent = ''; return; }
      if (!unlocked) hint.textContent = 'Tick all three boxes to unlock the hammer';
      else if (left === 5) hint.textContent = 'Drag the hammer onto the pumpkin and drop it';
      else hint.textContent = left + ' more \u2013 drop the hammer on another spot';
    }
    function flashHint(msg) {
      hint.textContent = msg;
      clearTimeout(hintTimer);
      hintTimer = setTimeout(updateHint, 2200);
    }

    /* ---------- the three boxes ---------- */
    boxes.forEach(b => b.addEventListener('click', () => {
      if (!ready || b.classList.contains('on')) return;
      b.classList.add('on'); b.setAttribute('aria-checked', 'true');
      if (boxes.every(x => x.classList.contains('on'))) {
        unlocked = true;
        ham.classList.add('unlocked');
        updateHint();
      }
    }));

    /* ---------- the hammer: drag it, drop it, the piece under the hammer head breaks ---------- */
    const setT = (dx, dy, s, rot) => { ham.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ') rotate(' + rot + 'deg)'; };

    /* which piece is under the drop point? returns {id, px, py} or null */
    function findTarget(hx, hy) {
      if (!built) return null;
      const r = stage.getBoundingClientRect();
      const px = Math.round((hx - r.left) / r.width * S), py = Math.round((hy - r.top) / r.height * S);
      if (px < 0 || py < 0 || px >= S || py >= S) return null;
      const i = py * S + px;
      if (!(op[i] || stemA[i] > 20)) return null;                        // empty space around the pumpkin
      const alive = id => !removed[id] && !cracking.has(id);
      if (op[i]) return alive(label[i]) ? { id: label[i], px, py } : null;   // already broken piece -> no
      let id = -1, best = 1e12;                                           // stem: nearest piece that is still whole
      [0, 1, 2, 3, 4].filter(alive).forEach(c => { const d = Math.hypot(regCent[c][0] - px, regCent[c][1] - py); if (d < best) { best = d; id = c; } });
      return id < 0 ? null : { id, px: regSeed[id][0], py: regSeed[id][1] };
    }

    function goHome() {
      if (won) { busy = false; return; }
      ham.classList.remove('drag');
      if (rm) { ham.style.transition = ''; ham.style.transform = ''; busy = false; return; }
      ham.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1)';
      ham.style.transform = '';
      setTimeout(() => { ham.style.transition = ''; busy = false; }, 520);
    }

    ham.addEventListener('pointerdown', e => {
      if (!unlocked || busy || won || !built || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      const r = ham.getBoundingClientRect();
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, hx: r.left + r.width * HX, hy: r.top + r.height * HY, dx: 0, dy: 0 };
      try { ham.setPointerCapture(e.pointerId); } catch (_) {}
      ham.style.animation = 'none';
      ham.style.transition = 'none';
      ham.classList.add('drag');
      setT(0, 0, 1.5, -8);
    });
    ham.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.sx; drag.dy = e.clientY - drag.sy;
      setT(drag.dx.toFixed(1), drag.dy.toFixed(1), 1.5, -8);
    });
    const endDrag = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null; busy = true;
      const hx = d.hx + d.dx, hy = d.hy + d.dy;
      const tg = e.type === 'pointercancel' ? null : findTarget(hx, hy);
      if (!tg) {                                                          // dropped in the wrong place -> spring back
        const out = !(op && (() => { const r = stage.getBoundingClientRect(); const px = Math.round((hx - r.left) / r.width * S), py = Math.round((hy - r.top) / r.height * S); return px >= 0 && py >= 0 && px < S && py < S && op[py * S + px]; })());
        if (e.type !== 'pointercancel') flashHint(out ? 'Drop the hammer right on the pumpkin' : 'That piece is already broken \u2013 try another spot');
        goHome();
        return;
      }
      if (rm) { startCrack(tg.id, tg.px, tg.py); goHome(); return; }
      ham.style.transition = 'transform .11s ease-in';                    // swing down
      setT(d.dx, d.dy, 1.5, 20);
      setTimeout(() => {
        startCrack(tg.id, tg.px, tg.py);
        ham.style.transition = 'transform .1s ease-out';
        setT(d.dx, d.dy, 1.5, 6);
      }, 110);
      setTimeout(goHome, 430);
    };
    ham.addEventListener('pointerup', endDrag);
    ham.addEventListener('pointercancel', endDrag);

    /* ---------- all broken -> next scene ---------- */
    function win() {
      won = true; ready = false;
      hwrap.classList.add('away');
      setTimeout(() => { liftLetter(); lt.classList.add('openenv'); }, rm ? 0 : 900);   // the envelope opens, right where it sits in the pumpkin
      setTimeout(enlargeLetter, rm ? 0 : 1900);                            // then it enlarges and the hearts rise from its bottom
      setTimeout(() => {
        sec.classList.add('exit');                                        // the stem slides away to the right
        setTimeout(() => { sec.classList.add('gone'); pfx.remove(); }, rm ? 0 : 1100);
      }, rm ? 0 : 1700);
    }

    /* ---------- hand-over: prize shown -> wait -> scratch card out, pumpkin in ---------- */
    function start() {
      if (starting || sec.classList.contains('show')) return;
      starting = true;
      if (scratchEl) scratchEl.classList.add('out');
      if (coinEl) coinEl.classList.add('gone');
      build().then(() => {
        if (!built) {
          console.warn('[pumpkin] skipping pumpkin, showing next scene');
          won = true; showLetterNow(); pfx.remove();
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
