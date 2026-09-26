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

  document.addEventListener('pointerdown', e => {
    if (e.target.closest('.sound')) return;
    shake(true);
  });

  // ---------- music (gapless loop via Web Audio) ----------

  const soundBtn = document.querySelector('.sound');
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audio = new AudioCtx();
  const master = audio.createGain();
  master.gain.value = 0;
  master.connect(audio.destination);

  let started = false;
  let muted = false;
  let unlockedAt = -Infinity;

  const track = fetch('holyman-intro.m4a')
    .then(r => r.arrayBuffer())
    .then(buf => new Promise((ok, fail) => audio.decodeAudioData(buf, ok, fail)));

  function setVolume(v, seconds) {
    const now = audio.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(v, now + seconds);
  }

  function render() {
    const on = started && !muted;
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.textContent = on ? 'sound on' : 'sound off';
  }

  async function start() {
    if (started) return;
    started = true;
    const buffer = await track;
    const src = audio.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(master);
    src.start();
    setVolume(muted ? 0 : 1, 2.5);
    render();
  }

  // Try right away; browsers only allow it after a click/tap/key, so retry then.
  audio.resume().then(() => { if (audio.state === 'running') start(); }).catch(() => {});

  // Mice unlock audio on pointerdown, touchscreens only on pointerup/touchend.
  const unlockEvents = ['pointerdown', 'pointerup', 'touchend', 'keydown'];
  function unlock() {
    if (!started) unlockedAt = performance.now();
    audio.resume().then(() => {
      if (audio.state !== 'running') return;
      unlockEvents.forEach(ev => removeEventListener(ev, unlock));
      start();
    });
  }
  unlockEvents.forEach(ev => addEventListener(ev, unlock));

  soundBtn.addEventListener('click', () => {
    // The same tap that unlocked audio already turned the sound on.
    if (!started || performance.now() - unlockedAt < 1000) return;
    muted = !muted;
    setVolume(muted ? 0 : 1, .6);
    render();
  });

  setTimeout(() => shake(true), 1400); // an opening shake
  schedule();
})();
