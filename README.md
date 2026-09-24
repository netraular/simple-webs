# simple-webs

Static pages served at **[webs.raular.com](https://webs.raular.com/)**.

No build step: drop a self-contained `.html` into `pages/`, commit, push — it
shows up on the home page within seconds, at
`https://webs.raular.com/pages/my-page.html`.

```
index.html   showcase landing (auto-lists pages/)
webs.json    optional title & description per page
favicon.ico  default tab icon
pages/       the published pages — one .html each
pages/data/  data files a page fetches at runtime
data-src/    scripts + raw sources that generate pages/data/
```

## Preview locally

From the repo root:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/pages/my-page.html`. Serve from the root (not
from `pages/`) so the relative `data/` fetches resolve. The landing page stays
empty locally — its card list comes from nginx's `_list/` endpoint.

## Title & description

Optional, keyed by filename in `webs.json`; falls back to the filename:

```json
{ "my-page.html": { "title": "My Page", "description": "What it does." } }
```

## Data files

Pages that need data fetch it from `pages/data/`. Regenerate it with the scripts
in `data-src/`: `build-*.mjs` hit the public APIs and write into `pages/data/`,
`test-*.mjs` check the result. Sources are documented in the `*.SOURCES.md`
files next to them.

```sh
cd data-src
node build-mercados.mjs   # --fresh re-downloads instead of using the cache
node test-mercados.mjs
```

Behind a TLS-intercepting proxy, prefix those with
`NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt`.

---

nginx + git-sync on a K3s homelab. Pages must be self-contained static HTML —
no server-side code.
