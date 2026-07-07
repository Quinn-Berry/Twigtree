/* ==========================================================================
   Twig Tree — grid rendering + the in-place detail expansion
   --------------------------------------------------------------------------
   All inventory lives in items.json ({ "items": [...] }). This script:
     1. fetches it and renders tiles into #grid
        - shop page  (body[data-page="shop"]) → items with sold: false
        - sold page  (body[data-page="sold"]) → items with sold: true
     2. handles the detail interaction: clicking a tile expands it in place
        into a full-width "detail row" (see expandItem below)
   ========================================================================== */

(function () {
  'use strict';

  const grid = document.getElementById('grid');
  if (!grid) return;

  const page = document.body.dataset.page; // "shop" | "sold"

  /** Currently expanded state, or null. { item, detailEl, tileEl } */
  let expanded = null;

  const money = (n) => '$' + Number(n).toLocaleString('en-US');

  const prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Load + render
     ------------------------------------------------------------------ */

  fetch('items.json')
    .then((res) => {
      if (!res.ok) throw new Error('items.json: HTTP ' + res.status);
      return res.json();
    })
    .then((data) => {
      const items = (data.items || []).filter((it) =>
        page === 'sold' ? it.sold : !it.sold
      );
      renderGrid(items);
    })
    .catch((err) => {
      console.error(err);
      grid.innerHTML =
        '<p style="grid-column:1/-1;color:#5d574d">Couldn’t load the inventory. Try refreshing.</p>';
    });

  function renderGrid(items) {
    grid.innerHTML = '';
    if (!items.length) {
      grid.innerHTML =
        '<p style="grid-column:1/-1;color:#5d574d">' +
        (page === 'sold' ? 'Nothing sold yet.' : 'The rack is empty — check back soon.') +
        '</p>';
      return;
    }
    items.forEach((item) => grid.appendChild(buildTile(item)));
  }

  /** One grid tile: cover image + name + price (or Sold flag). */
  function buildTile(item) {
    const cover = (item.images && item.images[0]) || '';
    const tile = document.createElement(page === 'shop' ? 'button' : 'div');
    tile.className = 'tile';
    tile.innerHTML = `
      <span class="tile__img-wrap"><img class="tile__img" src="${cover}" alt="${esc(item.name)}" loading="lazy"></span>
      <span class="tile__meta">
        <span class="tile__name">${esc(item.name)}</span>
        ${page === 'sold'
          ? '<span class="tile__sold-flag">Sold</span>'
          : `<span class="tile__price">${money(item.price)}</span>`}
      </span>`;

    if (page === 'shop') {
      tile.type = 'button';
      tile.setAttribute('aria-label', `View details: ${item.name}`);
      tile.addEventListener('click', () => {
        // Re-clicking the open item just closes it; otherwise swap to the new one.
        if (expanded && expanded.item.id === item.id) collapseDetail();
        else expandItem(item, tile);
      });
    }
    return tile;
  }

  /* ------------------------------------------------------------------
     THE DETAIL EXPANSION

     Layout trick: the detail row is a normal grid child with
     `grid-column: 1 / -1`, INSERTED AT THE START OF THE CLICKED TILE'S
     ROW, while the clicked tile itself is display:none'd. CSS grid
     auto-placement then does the reflow for us:

       [ a ][ b ][ c ]        click "e"        [ a ][ b ][ c ]
       [ d ][*e*][ f ]      ------------->     [ ===detail=== ]   ← inserted before "d"
       [ g ][ h ]                              [ d ][ f ][ g ]    ← e's row-mates flowed down
                                               [ h ]

     So no matter which column was clicked, the featured image sits at
     the LEFT of its own full-width row, and its former row-mates flow
     down into the next row, pushing everything below them down.

     Animation (two composed parts):
       1. FLIP — tile positions are measured before/after the DOM swap
          and the jump is played back as a decaying transform.
       2. The detail row itself animates height 0 → natural height, so
          lower rows are pushed down smoothly (layout reflows per frame).
     ------------------------------------------------------------------ */

  function expandItem(item, tileEl) {
    // Only one detail row at a time — remove any open one instantly
    // (the switch reads better as one movement than two chained ones).
    if (expanded) removeDetail(false);

    const detailEl = buildDetail(item);

    // Insert collapsed (height 0) so the FLIP pass below measures tile
    // positions against the *closed* row — the height animation then does
    // the pushing-down, frame by frame.
    detailEl.style.height = '0px';

    animateReflow(() => {
      // Find where the clicked tile's ROW starts, in visible-tile terms.
      const tiles = visibleTiles();
      const cols = columnCount();
      const idx = tiles.indexOf(tileEl);
      const rowStartTile = tiles[Math.floor(idx / cols) * cols];

      grid.insertBefore(detailEl, rowStartTile);
      tileEl.classList.add('tile--expanded'); // display:none — frees its slot
    });

    expanded = { item, detailEl, tileEl };

    // Grow the row open, then bring it into view (rows above/below stay
    // partially visible — it's an inline expansion, not a page).
    animateHeight(detailEl, 0, detailEl.scrollHeight).then(() => {
      detailEl.style.height = '';
      scrollDetailIntoView(detailEl);
    });
  }

  function collapseDetail() {
    if (!expanded) return;
    removeDetail(true);
  }

  /** Tear down the open detail row. animate=false → instant (used when swapping items). */
  function removeDetail(animate) {
    const { detailEl, tileEl } = expanded;
    expanded = null;

    const finish = () => {
      animateReflow(() => {
        detailEl.remove();
        tileEl.classList.remove('tile--expanded'); // tile takes its slot back
      });
    };

    if (animate) animateHeight(detailEl, detailEl.scrollHeight, 0).then(finish);
    else finish();
  }

  /** Build the full-width detail row: featured image + thumbs | info panel. */
  function buildDetail(item) {
    const el = document.createElement('article');
    el.className = 'detail';
    el.innerHTML = `
      <div class="detail__inner">
        <!-- Classic circular ✕ close button, top-right of the row -->
        <button class="icon-btn detail__close" aria-label="Close details">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <div class="detail__media">
          <div class="detail__cover-wrap">
            <img class="detail__cover" src="${item.images[0]}" alt="${esc(item.name)}">
          </div>
          <div class="detail__thumbs" role="group" aria-label="More photos"></div>
        </div>

        <div class="detail__info">
          <h2 class="detail__name">${esc(item.name)}</h2>
          <p class="detail__price">${money(item.price)}</p>
          <dl class="detail__specs">
            <dt>Condition</dt><dd>${esc(item.condition)}</dd>
            <dt>Size</dt><dd>${esc(item.size)}</dd>
          </dl>
          <p class="detail__story">${esc(item.story)}</p>
          <div class="detail__actions">
            <button class="btn btn--primary detail__add">Add to Cart</button>
          </div>
        </div>
      </div>`;

    el.querySelector('.detail__close').addEventListener('click', collapseDetail);

    /* --- Gallery: thumbnails swap into the main cover spot --- */
    const coverImg = el.querySelector('.detail__cover');
    const thumbsWrap = el.querySelector('.detail__thumbs');
    (item.images || []).forEach((src, i) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'detail__thumb' + (i === 0 ? ' is-active' : '');
      thumb.setAttribute('aria-label', `Photo ${i + 1} of ${item.images.length}`);
      thumb.innerHTML = `<img src="${src}" alt="">`;
      thumb.addEventListener('click', () => {
        if (coverImg.getAttribute('src') === src) return;
        coverImg.setAttribute('src', src);
        // retrigger the little crossfade
        coverImg.classList.remove('is-swapping');
        void coverImg.offsetWidth;
        coverImg.classList.add('is-swapping');
        thumbsWrap.querySelectorAll('.is-active').forEach((t) => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      });
      thumbsWrap.appendChild(thumb);
    });
    // A single photo needs no gallery strip
    if ((item.images || []).length < 2) thumbsWrap.remove();

    /* --- Add to Cart (cart.js exposes window.TwigCart) --- */
    const addBtn = el.querySelector('.detail__add');
    const syncBtn = () => {
      const inCart = window.TwigCart && window.TwigCart.has(item.id);
      addBtn.textContent = inCart ? 'In your cart ✓' : 'Add to Cart';
      addBtn.disabled = !!inCart;
    };
    syncBtn();
    addBtn.addEventListener('click', () => {
      if (window.TwigCart) {
        window.TwigCart.add(item);
        syncBtn();
      }
    });
    document.addEventListener('twigcart:change', syncBtn);

    return el;
  }

  /* ------------------------------------------------------------------
     Animation helpers
     ------------------------------------------------------------------ */

  /** Tiles currently participating in grid layout (skips the hidden expanded one). */
  function visibleTiles() {
    return Array.from(grid.querySelectorAll('.tile')).filter(
      (t) => !t.classList.contains('tile--expanded')
    );
  }

  /** How many columns the grid currently has (3 desktop / 2 tablet / 1 phone). */
  function columnCount() {
    return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  }

  /**
   * FLIP: measure tile positions, run the DOM mutation, measure again,
   * then play each tile's jump back as a transform decaying to zero —
   * so tiles glide to their new slots instead of teleporting.
   */
  function animateReflow(mutate) {
    if (prefersReducedMotion) { mutate(); return; }

    const tiles = visibleTiles();
    const before = new Map(tiles.map((t) => [t, t.getBoundingClientRect()]));

    mutate();

    visibleTiles().forEach((t) => {
      const from = before.get(t);
      if (!from) return; // tile wasn't visible before (just un-hidden) — let it pop in place
      const to = t.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (!dx && !dy) return;
      t.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    });
  }

  /**
   * Animate an element's height (overflow is hidden in CSS). Height is a
   * layout property, so everything below the detail row is pushed down /
   * pulled up smoothly, frame by frame. Resolves when done.
   */
  function animateHeight(el, from, to) {
    if (prefersReducedMotion) {
      el.style.height = to === 0 ? '0px' : '';
      return Promise.resolve();
    }
    el.style.height = from + 'px';
    const anim = el.animate(
      [{ height: from + 'px' }, { height: to + 'px' }],
      { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
    return anim.finished.catch(() => {}).then(() => {
      el.style.height = to + 'px';
    });
  }

  /** Nudge the page so the detail row is on screen, leaving a sliver of the row above. */
  function scrollDetailIntoView(el) {
    const rect = el.getBoundingClientRect();
    const margin = 90;
    if (rect.top < margin || rect.top > window.innerHeight * 0.5) {
      window.scrollTo({
        top: window.scrollY + rect.top - margin,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  }

  /** Escape text for safe HTML interpolation. */
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Keep the layout honest if the column count changes while a detail
     row is open (e.g. rotating a phone): re-seat the detail row at the
     start of the expanded tile's new row. */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!expanded) return;
      const { item, tileEl } = expanded;
      removeDetail(false);
      expandItem(item, tileEl);
    }, 150);
  });

  // Esc closes the detail row
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && expanded) collapseDetail();
  });
})();
