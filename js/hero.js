/* ==========================================================================
   Twig Tree — hero intro
   --------------------------------------------------------------------------
   Sequence:  logo flash (centered, oversized)
            → settle center-stage, big (.is-staging on the hero)
            → a classic typewriter cycles WORDS beneath it, forever
            → the whole group snaps into the top-left third (.is-docked)
              and the mission statement pops in beside it.
   The docked layout is the CSS default so the page is sane without JS;
   sizes for both states live in css/style.css (--logo-* / --type-*).
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

  /* Intro pacing (ms) — flash length must match the CSS keyframes.
     stageMs = how long the group holds center-stage once typing starts
     (long enough for the first word to land) before the dock snap. */
  const INTRO = { flashMs: 520, settleMs: 1000, stageMs: 2600 };

  /* -------------------------------------------------------------------- */

  const hero = document.getElementById('hero');
  const logo = document.getElementById('hero-logo');
  const wordEl = document.getElementById('hero-word');
  const cursor = document.getElementById('hero-cursor');
  if (!hero || !logo || !wordEl || !cursor) return;

  const reduceMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  if (reduceMotion) {
    // No sequence: the docked layout (CSS default) with mission visible
    // and one static word.
    wordEl.textContent = WORDS[0];
    cursor.classList.add('is-on');
    return;
  }

  // Apply the intro state (hidden, centered, oversized) before first paint,
  // then run: flash → settle center-stage → type loop → dock snap.
  hero.classList.add('is-staging');
  logo.classList.add('is-intro');
  requestAnimationFrame(async () => {
    logo.classList.add('is-flashing');
    await sleep(INTRO.flashMs);

    // Swap to the staged state; CSS transitions top/height/transform.
    logo.classList.remove('is-intro', 'is-flashing');
    await sleep(INTRO.settleMs + 150); // transition time + a beat

    typeLoop(); // starts now and keeps running through the dock snap

    await sleep(INTRO.stageMs);
    // Snap the logo + typewriter group into the top-left third; the CSS
    // rides the var change and pops the mission statement in beside it.
    hero.classList.remove('is-staging');
    hero.classList.add('is-docked');
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
