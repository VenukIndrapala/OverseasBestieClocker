'use strict';
/* =====================================================================
   Three questions + envelope + coin
   ---------------------------------------------------------------------
   - three cards, each needs a correct name; when all three are right the envelope opens by itself
   - the coin inside rises out of the envelope and can be dragged anywhere on the page
   - nothing is saved: every visit starts fresh (closed envelope, empty cards)
   ===================================================================== */

/* The accepted answer(s). Capitals, spaces, punctuation and accents are ignored, so "  NATI. " also works.
   Add more spellings / nicknames here, e.g. ['nati', 'natty']. (Anyone who views the page source can read this line.) */
const ANSWERS = ['nati'];

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const OK = ANSWERS.map(norm);

const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2400); };

const env = $('#envelope'), coin = $('#coin'), hint = $('#hint'), dots = $$('#progress i');
const solved = new Set();
let opened = false, ready = false;

/* decode the coin and the cow ahead of time, so nothing has to be decoded in the middle of the opening animation */
$$('#coin img, .env-flap image').forEach(el => {
  if (el.decode) el.decode().catch(() => {});
  else if (el.tagName === 'image') { const i = new Image(); i.src = el.getAttribute('href'); }
});

/* ---------------- the three cards ---------------- */
function check(card) {
  const q = card.dataset.q, input = card.querySelector('.ans');
  if (solved.has(q)) return;
  const v = input.value;
  if (!norm(v)) { toast('Type a name first'); input.focus(); return; }

  if (OK.includes(norm(v))) {
    solved.add(q);
    card.classList.add('done'); input.readOnly = true; input.setAttribute('aria-disabled', 'true');
    dots[solved.size - 1].classList.add('on');
    $('#progress').setAttribute('aria-label', solved.size + ' of 3 answers correct');
    restart(env, 'nudge');
    toast(solved.size === 3 ? 'All three right!' : 'Correct · ' + solved.size + ' of 3');
    if (solved.size === 3) { input.blur(); setTimeout(openEnvelope, reduce ? 0 : 900); }
    else { const next = $$('.qc:not(.done) .ans')[0]; if (next) next.focus(); }
  } else {
    restart(card, 'bad');
    toast('Not quite - try again');
    input.focus(); input.select();
  }
}
function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 600); }

$('#qlist').addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.classList.contains('ans') || e.isComposing) return;
  e.preventDefault(); check(e.target.closest('.qc'));
});
$('#qlist').addEventListener('click', e => { const b = e.target.closest('.qbtn'); if (b) check(b.closest('.qc')); });

/* ---------------- the envelope opens ----------------
   The whole sequence now lives in CSS (see letter.css, "ENVELOPE"):
     1. the flap swings up (the layer change happens by itself at the exact moment it is edge-on, so nothing pops)
     2. the coin glides up out of the pocket a moment later
   JS only switches it on with one class, then waits for the coin's glide to finish before allowing it to be grabbed.
   The old version used a chain of setTimeouts to swap layers mid-swing, which is what made the opening look jumpy. */
function openEnvelope() {
  if (opened) return; opened = true;

  const settle = () => {                                             // the coin has arrived: it can be grabbed now
    if (ready) return; ready = true;
    coin.removeEventListener('transitionend', onEnd);
    coin.classList.add('risen'); coin.tabIndex = 0;                  // same resting position, so there is no visual jump
    hint.textContent = 'Drag the coin out'; hint.classList.add('show');
  };
  const onEnd = e => { if (e.target === coin && e.propertyName === 'transform') settle(); };
  coin.addEventListener('transitionend', onEnd);
  setTimeout(settle, reduce ? 0 : 2300);                             // safety net in case transitionend never fires

  env.classList.add('open');                                         // go
}

/* ---------------- dragging the coin ----------------
   Once the coin is out it is a loose piece fixed to the screen. Everything is measured from its CENTRE, so it can
   shrink (--cs) for the scratch card without jumping under the pointer. */
let drag = null, cs = 1;
const coinW = () => coin.offsetWidth;                                // layout size (before the scale)
const half = () => coinW() * cs / 2;                                 // visible radius
const centre = () => { const r = coin.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
function setCentre(cx, cy) {                                         // moves the coin so its centre is at (cx, cy), kept on screen
  const W = coinW(), h = half();
  cx = Math.max(h, Math.min(cx, innerWidth - h)); cy = Math.max(h, Math.min(cy, innerHeight - h));
  coin.style.left = (cx - W / 2) + 'px'; coin.style.top = (cy - W / 2) + 'px';
  return [cx, cy];
}

function freeCoin() {                                                // take the coin out of the envelope: it becomes a loose piece on the page
  if (coin.classList.contains('free')) return;
  const r = coin.getBoundingClientRect();
  coin.classList.remove('in-env', 'risen');
  coin.classList.add('free');
  Object.assign(coin.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.width + 'px' });
  document.body.appendChild(coin);                                   // on top of everything, so it can pass over the cards
  hint.classList.remove('show');
  setTimeout(() => { hint.textContent = ''; }, 500);
  enterScratch();                                                    // the coin is out: the old cards leave, the scratch card arrives
}

coin.addEventListener('pointerdown', e => {
  if (!ready || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault();
  freeCoin();
  const c = centre();
  drag = { ox: e.clientX - c[0], oy: e.clientY - c[1], lastX: e.clientX, tilt: 0 };
  coin.classList.add('drag');
});
window.addEventListener('pointermove', e => {
  if (!drag) return;
  const c = setCentre(e.clientX - drag.ox, e.clientY - drag.oy);
  scratchAt(c[0], c[1]);
  const vx = e.clientX - drag.lastX; drag.lastX = e.clientX;         // it leans a little the way it is being pulled
  drag.tilt = Math.max(-14, Math.min(14, drag.tilt * .6 + vx * .9));
  coin.firstElementChild.style.rotate = drag.tilt + 'deg';
});
function drop() {
  if (!drag) return; drag = null; lastPt = null;
  coin.classList.remove('drag');
  coin.firstElementChild.style.rotate = '0deg';
  if (!reduce) coin.firstElementChild.animate([{ scale: 1.08 }, { scale: .95, offset: .55 }, { scale: 1 }], { duration: 380, easing: 'ease-out' });   // a little settle
}
window.addEventListener('pointerup', drop);
window.addEventListener('pointercancel', drop);

/* keyboard: Enter / Space takes the coin out, arrow keys move it (Shift = bigger steps) */
coin.addEventListener('keydown', e => {
  if (!ready) return;
  const step = e.shiftKey ? 60 : 16, mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); freeCoin(); return; }
  if (!mv) return; e.preventDefault(); freeCoin();
  const c = centre(), n = setCentre(c[0] + mv[0], c[1] + mv[1]);
  scratchAt(n[0], n[1]);
});

addEventListener('resize', () => {                                   // keep a loose coin on screen
  if (!coin.classList.contains('free')) return;
  const c = centre(); setCentre(c[0], c[1]);
});

/* =====================================================================
   SCRATCH MODE
   ---------------------------------------------------------------------
   enterScratch(): the question cards + envelope slide up (CSS, body.scratch-mode), the scratch card slides in from
   the bottom (CSS, #scratch.show), the coin shrinks to a size that suits the card.
   The silver layer is a canvas; dragging the coin over it erases the silver and "haha" shows through.
   ===================================================================== */
const sc = $('#scratch'), cv = $('#scv'), ctx = cv.getContext('2d'), stage = $('.stage');
const CW = 760, CH = 359;                                            // canvas pixels (same shape as the silver panel)
cv.width = CW; cv.height = CH;
let scratchOn = false, scratchLive = false, cleared = false, lastPt = null, checkT = 0;

function drawSilver() {
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createLinearGradient(0, 0, CW, 0);                   // the metallic base: light in the middle, darker toward the right end
  [[0, '#d5d7df'], [.22, '#eceef4'], [.55, '#e3e5ec'], [.84, '#d8dae1'], [1, '#c3c6ce']].forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
  const sh = ctx.createLinearGradient(0, 0, CW * .8, CH);            // a soft diagonal sheen
  sh.addColorStop(0, 'rgba(255,255,255,.5)'); sh.addColorStop(.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,.22)');
  ctx.fillStyle = sh; ctx.fillRect(0, 0, CW, CH);

  ctx.strokeStyle = 'rgba(120,124,140,.42)'; ctx.lineWidth = 2.2;    // the wavy lines
  for (let i = -3; i < 17; i++) {
    ctx.beginPath();
    for (let x = 0; x <= CW; x += 8) { const y = i * 26 + x * .12 + Math.sin(x / 115 + i * .05) * 18; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(206,209,219,.96)';                           // the "Scratch & Win" disc
  ctx.beginPath(); ctx.arc(CW / 2, CH / 2, CH * .31, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9a9eaa'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '400 37px "Lobster Two", "Lobster", cursive';
  ctx.fillText('Scratch', CW / 2, CH / 2 - 42); ctx.fillText('&', CW / 2, CH / 2 + 1); ctx.fillText('Win', CW / 2, CH / 2 + 44);
}
drawSilver();
if (document.fonts && document.fonts.load) {                         // draw again once the fonts have arrived
  Promise.all([document.fonts.load('400 37px "Lobster Two"'), document.fonts.load('400 20px "Lobster"')]).then(() => { if (!cleared && !lastPt) drawSilver(); }).catch(() => {});
}

function enterScratch() {
  if (scratchOn) return; scratchOn = true;
  document.body.classList.add('scratch-mode');                       // question cards + envelope slide up
  sc.classList.add('show');                                          // scratch card slides in from the bottom
  cs = Math.min(1, 76 / coinW());                                    // the coin shrinks to about 76px across
  coin.style.setProperty('--cs', cs);
  setTimeout(() => { scratchLive = true; }, reduce ? 0 : 1350);      // scratching works once the card has landed
  setTimeout(() => { stage.hidden = true; scrollTo(0, 0); const c = centre(); setCentre(c[0], c[1]); }, reduce ? 0 : 1300);   // the old page is gone
}

function scratchAt(cx, cy) {                                         // erase the silver under the coin
  if (!scratchLive || cleared) return;
  const z = cv.getBoundingClientRect(), k = CW / z.width;
  const x = (cx - z.left) * k, y = (cy - z.top) * k, rad = half() * .9 * k;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = rad * 2;
  ctx.beginPath(); ctx.moveTo(lastPt ? lastPt.x : x, lastPt ? lastPt.y : y); ctx.lineTo(x, y); ctx.stroke();
  lastPt = { x, y };
  if (!checkT) checkT = setTimeout(checkCleared, 180);
}
function checkCleared() {                                           // once about half the silver is gone, the rest fades away
  checkT = 0; if (cleared) return;
  const d = ctx.getImageData(0, 0, CW, CH).data; let n = 0, tot = 0;
  for (let i = 3; i < d.length; i += 32) { tot++; if (d[i] < 40) n++; }
  if (n / tot > .5) { cleared = true; cv.classList.add('gone'); sc.classList.add('cleared'); }
}

/* click "pop" feedback */
document.addEventListener('click', e => { const m = e.target.closest('[data-pop]'); if (!m) return; m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); });

if (matchMedia('(hover:hover)').matches) $('#a1').focus({ preventScroll: true });   // no auto-keyboard on phones
