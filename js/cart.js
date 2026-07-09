/* ==========================================================================
   Twig Tree — client-side cart
   --------------------------------------------------------------------------
   A simple slide-out cart. Everything is one-of-one vintage, so the cart is
   a set of items (no quantities). State persists in localStorage so a
   refresh doesn't lose your picks.

   Exposes window.TwigCart = { add, remove, has, items } — main.js calls
   add()/has() from the detail row's "Add to Cart" button, and listens for
   the "twigcart:change" event to keep that button in sync.
   ========================================================================== */

(function () {
  'use strict';

  const STORAGE_KEY = 'twigtree-cart';

  const panel = document.getElementById('cart');
  const scrim = document.getElementById('cart-scrim');
  const listEl = document.getElementById('cart-list');
  const emptyEl = document.getElementById('cart-empty');
  const totalEl = document.getElementById('cart-total');
  const toggleBtn = document.getElementById('cart-toggle');
  const closeBtn = document.getElementById('cart-close');
  const checkoutBtn = document.getElementById('cart-checkout');
  if (!panel) return; // no cart on this page (e.g. the Sold archive)

  const money = (n) => '$' + Number(n).toLocaleString('en-US');

  /** Cart contents: array of { id, name, price, image } snapshots. */
  let items = load();

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    render();
    // Let the rest of the page (detail row button) react to cart changes
    document.dispatchEvent(new CustomEvent('twigcart:change'));
  }

  /* ------------------------------------------------------------------
     Public API
     ------------------------------------------------------------------ */

  window.TwigCart = {
    add(item) {
      if (this.has(item.id)) return;
      items.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image: (item.images && item.images[0]) || '',
      });
      save();
      open(); // show the cart so the add is felt immediately
    },
    remove(id) {
      items = items.filter((it) => it.id !== id);
      save();
    },
    has(id) {
      return items.some((it) => it.id === id);
    },
    items: () => items.slice(),
  };

  /* ------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------ */

  function render() {
    listEl.innerHTML = '';
    emptyEl.hidden = items.length > 0;

    items.forEach((it) => {
      const li = document.createElement('li');
      li.className = 'cart__item';
      li.innerHTML = `
        <img src="${it.image}" alt="">
        <div class="cart__item-body">
          <div class="cart__item-name"></div>
          <div class="cart__item-price">${money(it.price)}</div>
        </div>
        <button class="cart__remove" type="button">Remove</button>`;
      li.querySelector('.cart__item-name').textContent = it.name;
      li.querySelector('.cart__remove').addEventListener('click', () =>
        window.TwigCart.remove(it.id)
      );
      listEl.appendChild(li);
    });

    const total = items.reduce((sum, it) => sum + Number(it.price || 0), 0);
    totalEl.textContent = money(total);

    // Badge counts (nav pill + floating button)
    document.querySelectorAll('.cart-toggle__count').forEach((el) => {
      el.textContent = items.length;
      el.hidden = items.length === 0;
    });

    checkoutBtn.disabled = items.length === 0;
  }

  /* ------------------------------------------------------------------
     Open / close
     ------------------------------------------------------------------ */

  function open() {
    panel.hidden = false;
    scrim.hidden = false;
    // next frame so the transition actually plays
    requestAnimationFrame(() => {
      panel.classList.add('is-open');
      scrim.classList.add('is-open');
    });
  }

  function close() {
    panel.classList.remove('is-open');
    scrim.classList.remove('is-open');
    setTimeout(() => {
      panel.hidden = true;
      scrim.hidden = true;
    }, 350); // matches the CSS transition
  }

  toggleBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
  });

  /* ------------------------------------------------------------------
     Checkout / Reserve — PLACEHOLDER
     ------------------------------------------------------------------
     >>> PAYMENT INTEGRATION GOES HERE <<<
     Swap this mailto for a real checkout when ready — e.g. Stripe
     Payment Links (simplest for one-of-one items: one link per item),
     Stripe Checkout via a Netlify Function, or PayPal buttons.
     ------------------------------------------------------------------ */

  checkoutBtn.addEventListener('click', () => {
    if (!items.length) return;
    const lines = items.map((it) => `- ${it.name} (${money(it.price)})`);
    const total = items.reduce((sum, it) => sum + Number(it.price || 0), 0);
    const body =
      `Hi Eli,%0D%0A%0D%0AI'd like to reserve:%0D%0A` +
      encodeURIComponent(lines.join('\n')).replace(/%0A/g, '%0D%0A') +
      `%0D%0A%0D%0ATotal: ${encodeURIComponent(money(total))}%0D%0A%0D%0AThanks!`;
    window.location.href =
      'mailto:elibillings17@gmail.com?subject=' +
      encodeURIComponent('twigtree reservation') +
      '&body=' + body;
  });

  /* ------------------------------------------------------------------
     Floating cart button — appears once the hero nav has scrolled away
     ------------------------------------------------------------------ */

  const hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    const fab = document.createElement('button');
    fab.className = 'cart-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Open cart');
    fab.innerHTML = 'Cart <span class="cart-toggle__count" hidden>0</span>';
    fab.addEventListener('click', open);
    document.body.appendChild(fab);

    new IntersectionObserver(
      ([entry]) => fab.classList.toggle('is-visible', !entry.isIntersecting),
      { threshold: 0.05 }
    ).observe(hero);
  }

  render();
})();
