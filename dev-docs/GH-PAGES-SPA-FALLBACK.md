# GitHub Pages SPA 404 Fallback

How to make direct links to client-side routes (e.g. `/examples/<slug>`) work on a GitHub Pages deploy of the demo, instead of 404ing.

## Why it's needed

GitHub Pages is a static file host with no rewrite or redirect rules — it can only serve files that physically exist. The demo is a single-page app with path-based client-side routing (`wouter`, configured with a `Router base`). Routes such as `/examples/:slug`, `/raw-html`, and `/shadow-test` exist only in the browser; there are no matching files on disk.

So in-app navigation works (clicking a link is handled client-side, with no server round-trip), but **loading, refreshing, bookmarking, or sharing** one of those URLs goes straight to GitHub Pages, which finds no file and returns its 404 page. This is the failure mode that bites shared README links to specific examples.

## The fix

GitHub Pages serves a custom `404.html` from the root of the publishing source for any path it can't resolve. If that `404.html` is a copy of `index.html` (the SPA shell), the app boots, the router reads the current URL, and renders the right route — turning the would-be 404 into a working deep link.

For a request to `/json-edit-react-v2/examples/foo`:

1. GitHub Pages finds no matching file, so it serves `404.html` (with an HTTP 404 status). The browser URL stays `/json-edit-react-v2/examples/foo`.
2. `404.html` is the SPA shell; its absolute asset URLs (baked in at build time) resolve to the real JS/CSS and load.
3. `wouter` reads `location.pathname`, strips the `Router base`, matches `/examples/foo`, and renders that example.

The only cost is that the initial document carries a 404 status code. That's irrelevant for human visitors and fine for a demo/preview site. (If a clean 200 matters — e.g. for crawlers — see [Redirect variant](#optional-redirect-variant) below.)

## Implementing it (Vite plugin)

Add a build-time plugin to [demo/vite.config.ts](../demo/vite.config.ts) that copies the emitted `index.html` to `404.html`. It is base-agnostic: it copies whatever `index.html` the build produced, so the same plugin serves the primary deploy and any `VITE_BASE_PATH`-overridden preview (e.g. the v2 site).

```ts
// Copy index.html → 404.html so GitHub Pages serves the SPA shell for any
// unmatched path (deep links, refreshes, shared URLs), letting wouter
// client-route instead of 404ing. Base-agnostic — it copies whatever base
// the build was made with.
const spaFallbackPlugin = {
  name: 'spa-404-fallback',
  closeBundle() {
    const out = path.resolve(__dirname, 'build')
    const index = path.join(out, 'index.html')
    if (fs.existsSync(index)) fs.copySync(index, path.join(out, '404.html'))
  },
}
```

Register it alongside the existing plugins:

```ts
plugins: [react(), json5Plugin(), spaFallbackPlugin],
```

`path` and `fs` (`fs-extra`) are already imported at the top of the config, so no new imports are needed.

This applies to **both** deploys: the primary site (`/json-edit-react/`) gains working deep links for its `/examples`, `/raw-html`, and `/shadow-test` routes, and the v2 preview gets them under its own base.

## Build with the correct base

The fallback only works if the SPA shell's asset URLs resolve. Those URLs are absolute and baked from Vite's `base`, so the build has to target the path the site is actually served at:

- **Primary site** (`/json-edit-react/`, the default `base`): `yarn build`
- **V2 preview repo** (`/json-edit-react-v2/`): `yarn build-v2` (sets `VITE_BASE_PATH=/json-edit-react-v2/`)

A `404.html` copied from an `index.html` that was built for the wrong base will boot but fail to load its JS/CSS — a blank page, not a working route. The `base` and the deploy target must match.

## Verifying

After a build, confirm the file exists and points at the expected base:

```sh
ls demo/build/404.html
grep -o '/json-edit-react[^"]*\.js' demo/build/404.html | head   # check the baked base
```

Note that `vite preview` and most local static servers **auto-fall-back to `index.html`** for unmatched paths, which *hides* the problem — they serve the app for any URL whether or not `404.html` exists. The faithful test is the deployed site: after deploying, open a deep link directly in a fresh tab (e.g. `https://carlosnz.github.io/json-edit-react-v2/examples/<slug>`) and confirm it loads the right route rather than the GitHub 404 page.

## Optional: disable Jekyll

GitHub Pages runs Jekyll by default. Vite's output doesn't use underscore-prefixed paths, so it generally works untouched, but you can disable Jekyll for safety by passing `--nojekyll` to the deploy command (it adds a `.nojekyll` marker file):

```sh
gh-pages -d build --nojekyll --repo https://github.com/CarlosNZ/json-edit-react-v2.git
```

## Optional: redirect variant

If you need the deep-link document to return a clean **200** instead of a 404 status (for SEO/crawlers), use the [spa-github-pages](https://github.com/rafgraph/spa-github-pages) approach instead of the plain copy: a `404.html` that encodes the path into a query string and redirects to `index.html`, which decodes it back on boot. It's more moving parts; for this demo the plain copy above is recommended.

## After V2 ships: repurposing as a permanent redirector

Once V2 becomes the primary site at `/json-edit-react/`, the separate `json-edit-react-v2` repo can keep its Pages site alive as a redirect shim, so any links that leaked out still resolve and you never have to edit them. Because GitHub Pages serves that repo's `404.html` for every unmatched path under `/json-edit-react-v2/`, a single redirecting `404.html` catches all old deep links:

```html
<!doctype html>
<meta charset="utf-8" />
<script>
  // Forward /json-edit-react-v2/* → /json-edit-react/* on the same host,
  // preserving the rest of the path and any query/hash.
  location.replace(location.href.replace('/json-edit-react-v2/', '/json-edit-react/'))
</script>
```

This is the link-rot insurance from the preview-hosting plan — and it's only possible because the preview lives on its own site root with its own dedicated `404.html` slot, rather than as a subfolder of the live site.
