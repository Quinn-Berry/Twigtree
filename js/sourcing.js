/* ==========================================================================
   twigtree — sourcing request form (Netlify Forms)

   The form itself is plain static HTML in index.html (name="sourcing-request",
   data-netlify="true"), which is what Netlify parses at deploy time to set up
   the submission endpoint. This script only improves the experience: it
   submits via fetch so the visitor stays on the page, then swaps the form
   for the thank-you note.

   Without JS (or if this script fails) the form still POSTs normally and
   Netlify shows its default success page — nothing is lost.
   ========================================================================== */

(function () {
  'use strict';

  const form = document.getElementById('sourcing-form');
  const thanks = document.getElementById('sourcing-thanks');
  const errorNote = document.getElementById('sourcing-error');
  if (!form || !thanks) return;

  /* Local static servers can't accept POSTs, so when developing we show the
     thank-you state anyway. In production (Netlify) the POST is real. */
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  function showThanks() {
    form.hidden = true;
    thanks.hidden = false;
    thanks.focus(); // move screen-reader/keyboard focus to the confirmation
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Sending…';
    errorNote.hidden = true;

    // Netlify expects url-encoded pairs, including the hidden form-name field
    const body = new URLSearchParams(new FormData(form)).toString();

    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      showThanks();
    } catch (err) {
      if (isLocal) {
        showThanks(); // dev preview: pretend it worked
      } else {
        errorNote.hidden = false;
        button.disabled = false;
        button.textContent = 'Start the search';
      }
    }
  });
})();
