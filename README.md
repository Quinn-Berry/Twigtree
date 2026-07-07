# Twig Tree

A small, curated vintage streetwear resale site. Plain HTML/CSS/JS — no framework,
no build step. Designed for Netlify (works on GitHub Pages too, see below).

## Run it locally

The site fetches `items.json` at runtime, so open it through a local server
(not `file://`):

```bash
cd twigtree
python3 -m http.server 8000
# → http://localhost:8000
```

Any static server works (`npx serve`, VS Code Live Server, etc.).

## Where things live

| What | Where |
|---|---|
| Inventory (single source of truth) | `items.json` — `{ "items": [ ... ] }` |
| Product photos | `/assets/uploads/` |
| Logo / hero image | `/assets/logo.png`, `/assets/hero.jpg` — **placeholders, swap for the real ones (same filenames)** |
| Styles | `css/style.css` |
| Grid + detail expansion | `js/main.js` |
| Cart | `js/cart.js` |
| CMS | `/admin/` (Decap CMS) |

Each item in `items.json`: `id`, `name`, `price`, `size`, `condition`, `story`,
`images` (ordered — first is the cover), `sold`, `dateAdded`. Items render in
file order; `sold: true` moves a piece from the main grid to `sold.html`.

## Managing inventory (/admin)

Decap CMS is configured in `admin/config.yml` against the `git-gateway` backend:

1. Deploy the repo on **Netlify**.
2. In the Netlify dashboard: **Site settings → Identity → Enable Identity**,
   then **Services → Enable Git Gateway**, and invite yourself as a user
   (set registration to invite-only).
3. Visit `https://<your-site>/admin/`, log in, open **Inventory → Items**.

From there: **Add items +**, fill the form, drag photos in (uploads land in
`/assets/uploads/` automatically), publish. Flip **Sold** when a piece sells.
No file naming, no git.

**Hosting on GitHub Pages instead?** Swap the backend in `admin/config.yml`
to the `github` backend with an OAuth app — the comment at the top of that
file explains the setup.

## Checkout

The cart's "Checkout / Reserve" is a placeholder (a mailto to Eli). Real
payment integration goes in `js/cart.js` — look for
`>>> PAYMENT INTEGRATION GOES HERE <<<`.
