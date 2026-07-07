/* ==========================================================================
   Twig Tree — hero intro
   --------------------------------------------------------------------------
   Sequence:  logo flash (centered, oversized)
            → settle into its big resting spot (CSS transition — the logo
              fills most of the hero, sizes live in css/style.css --logo-*)
            → a classic typewriter cycles WORDS beneath it, forever.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------- EDIT ME: the cycling words ---------------- */
  const WORDS = [
    'vintage shirts',
    'authentic',
    'dated',
    'rare',
    'timepiece',
    'one of one',
    'archival',
    'worn-in',
  ];

  /* Typewriter pacing (ms) */
  const TYPE = {
    typeMs: 95,      // per character typed
    deleteMs: 48,    // per character deleted
    holdMs: 1000,    // full word on screen
    gapMs: 450,      // empty pause between words
  };

  /* Intro pacing (ms) — flash length must match the CSS keyframes */
  const INTRO = { flashMs: 520, settleMs: 1000 };

  /* -------------------------------------------------------------------- */

  const logo = document.getElementById('hero-logo');
  const wordEl = document.getElementById('hero-word');
  const cursor = document.getElementById('hero-cursor');
  if (!logo || !wordEl || !cursor) return;

  const reduceMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  if (reduceMotion) {
    // No sequence: logo sits settled (the CSS default) with one static word.
    wordEl.textContent = WORDS[0];
    cursor.classList.add('is-on');
    return;
  }

  // Apply the intro state (hidden, centered, oversized) before first paint,
  // then run: flash → settle → type loop.
  logo.classList.add('is-intro');
  requestAnimationFrame(async () => {
    logo.classList.add('is-flashing');
    await sleep(INTRO.flashMs);

    // Swap to the settled state; CSS transitions top/height/transform.
    logo.classList.remove('is-intro', 'is-flashing');
    await sleep(INTRO.settleMs + 150); // transition time + a beat

    typeLoop();
  });

  async function typeLoop() {
    cursor.classList.add('is-on');
    for (let w = 0; ; w = (w + 1) % WORDS.length) {
      const word = WORDS[w];

      cursor.classList.remove('is-blinking'); // steady cursor while typing
      for (let i = 1; i <= word.length; i++) {
        wordEl.textContent = word.slice(0, i);
        await sleep(TYPE.typeMs);
      }

      cursor.classList.add('is-blinking');
      await sleep(TYPE.holdMs);
      cursor.classList.remove('is-blinking');

      for (let i = word.length - 1; i >= 0; i--) {
        wordEl.textContent = word.slice(0, i);
        await sleep(TYPE.deleteMs);
      }

      cursor.classList.add('is-blinking');
      await sleep(TYPE.gapMs);
    }
  }
})();
