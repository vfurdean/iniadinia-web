(() => {
  const root = document.documentElement;
  const body = document.body;
  const dateEl = document.querySelector('.date');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MASK = 'xx.xx.xxxx';
  const REAL_DATE = (dateEl.dataset.date || '').trim(); // empty = keep it secret

  // ---------- glow (reveals the date while shaking) ----------

  let glow = 0;
  let animating = false;

  function fade() {
    glow *= .93;
    if (glow < .005) glow = 0;
    root.style.setProperty('--glow', glow.toFixed(3));
    if (glow > 0) requestAnimationFrame(fade);
    else animating = false;
  }

  function pulse(amount) {
    glow = Math.max(glow, amount);
    if (!animating) {
      animating = true;
      requestAnimationFrame(fade);
    }
  }

  // ---------- the hidden date ----------

  let scrambleTimer = null;
  function scrambleDate() {
    clearInterval(scrambleTimer);
    let ticks = 0;
    scrambleTimer = setInterval(() => {
      ticks++;
      if (ticks > 9) {
        clearInterval(scrambleTimer);
        dateEl.textContent = MASK;
        return;
      }
      // Near the end, briefly show the real date if one has been set.
      if (REAL_DATE && ticks >= 6) { dateEl.textContent = REAL_DATE; return; }
      dateEl.textContent = MASK.replace(/x/g, () => (Math.random() < .35 ? 'x' : Math.floor(Math.random() * 10)));
    }, 55);
  }

  // ---------- shake ----------

  function shake(hard = Math.random() < .35) {
    pulse(hard ? 1 : .6);
    scrambleDate();
    if (reducedMotion) return;
    body.classList.remove('shake', 'shake-hard');
    void body.offsetWidth; // restart animation
    body.classList.add(hard ? 'shake-hard' : 'shake');
  }

  function schedule() {
    const wait = 5000 + Math.random() * 9000;
    setTimeout(() => {
      if (!document.hidden) shake();
      schedule();
    }, wait);
  }

  document.addEventListener('pointerdown', () => shake(true));

  setTimeout(() => shake(true), 1400); // an opening shake
  schedule();
})();
