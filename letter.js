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

/* ---------------- the envelope opens ---------------- */
function openEnvelope() {
  if (opened) return; opened = true;
  env.classList.add('open');                                         // the flap swings back
  const t = reduce ? 0 : 1;
  setTimeout(() => env.classList.add('flap-back'), 330 * t);         // once it is over the top it sits behind the coin
  setTimeout(() => {                                                 // the coin slides up out of the pocket
    coin.classList.add('risen'); coin.tabIndex = 0;
    hint.textContent = 'Drag the coin out'; hint.classList.add('show');
  }, 800 * t);
  setTimeout(() => { ready = true; }, 1500 * t);                     // it can be grabbed once it has settled
}

/* ---------------- dragging the coin ---------------- */
let drag = null;
const docW = () => Math.max(document.documentElement.scrollWidth, innerWidth);
const docH = () => Math.max(document.documentElement.scrollHeight, innerHeight);
const clampX = (x, w) => Math.max(0, Math.min(x, docW() - w));
const clampY = (y, h) => Math.max(0, Math.min(y, docH() - h));

function freeCoin() {                                                // take the coin out of the envelope: it becomes a loose piece on the page
  if (coin.classList.contains('free')) return;
  const r = coin.getBoundingClientRect();
  coin.classList.remove('in-env', 'risen');
  coin.classList.add('free');
  Object.assign(coin.style, { left: (r.left + scrollX) + 'px', top: (r.top + scrollY) + 'px', width: r.width + 'px', height: r.width + 'px' });
  document.body.appendChild(coin);                                   // on top of everything, so it can pass over the cards
  hint.classList.remove('show');
  setTimeout(() => { hint.textContent = ''; }, 500);
}

coin.addEventListener('pointerdown', e => {
  if (!ready || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault();
  freeCoin();
  const r = coin.getBoundingClientRect();
  drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, lastX: e.clientX, tilt: 0 };
  coin.classList.add('drag');
});
window.addEventListener('pointermove', e => {
  if (!drag) return;
  coin.style.left = clampX(e.clientX + scrollX - drag.dx, drag.w) + 'px';
  coin.style.top = clampY(e.clientY + scrollY - drag.dy, drag.h) + 'px';
  const vx = e.clientX - drag.lastX; drag.lastX = e.clientX;         // it leans a little the way it is being pulled
  drag.tilt = Math.max(-14, Math.min(14, drag.tilt * .6 + vx * .9));
  coin.firstElementChild.style.rotate = drag.tilt + 'deg';
});
function drop() {
  if (!drag) return; drag = null;
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
  const r = coin.getBoundingClientRect();
  coin.style.left = clampX(r.left + scrollX + mv[0], r.width) + 'px';
  coin.style.top = clampY(r.top + scrollY + mv[1], r.height) + 'px';
});

addEventListener('resize', () => {                                   // keep a loose coin on screen
  if (!coin.classList.contains('free')) return;
  const r = coin.getBoundingClientRect();
  coin.style.left = clampX(r.left + scrollX, r.width) + 'px';
  coin.style.top = clampY(r.top + scrollY, r.height) + 'px';
});

/* click "pop" feedback */
document.addEventListener('click', e => { const m = e.target.closest('[data-pop]'); if (!m) return; m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); });

if (matchMedia('(hover:hover)').matches) $('#a1').focus({ preventScroll: true });   // no auto-keyboard on phones
