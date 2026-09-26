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

`transporte-publico.html` is the one pipeline with a required order — each step
feeds the next, and every step is resumable. It absorbed `pisos-vs-distancia.html`
in 2026-09: one page now answers both halves of the question, so the price data,
the indicators and the price-vs-commute plot all live here.

```sh
cd data-src
python3 fetch-transit.py     # ~1.150 routing queries, ~1 h
python3 fetch-isocronas.py   # 165 one-to-all queries, ~6 min
node fetch-linies.mjs        # OpenStreetMap; needs transit.json to pick the buses
python3 build_seguretat.py   # crime + urban green space, by municipality
node build-transport.mjs     # merges into pages/data/ — downloads nothing
node test-transport.mjs      # contract, coverage and estimator error
node test-capas.mjs          # the page's own layer code, run against the data
```

`build-transport.mjs` only reorganises what the three fetch steps produced: it
merges the 91 municipalities and the 73 Barcelona neighbourhoods into one set of
164 zones, attaches the INE/Idescat indicators, simplifies their geometry, and
splits the output by when the page needs it (≈550 kB up front, the itineraries
and the isochrone matrix on demand). Re-run it on its own after touching any of
its inputs.

`pisos-bcn.json`, `bcn-barris.json`, `municipis-geo.json` and `bcn-barris-geo.json`
still live in `pages/data/` but no page fetches them any more — since the merge
they are only inputs to `build-transport.mjs`. They stay there so the pipeline
keeps working unchanged; nothing downloads them at runtime.

Behind a TLS-intercepting proxy, prefix those with
`NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt`.

**Heads-up on Barcelona's open-data portal** (checked 2026-09-26): its
`/download` URLs now sit behind BunkerWeb + hCaptcha and answer **HTTP 200**
with a ~12 kB "Bot Detection" page instead of the CSV, so a script that
doesn't look would cache HTML and silently null out the fields.
`build_indicadors.py` now refuses that; its cache predates the block, so it
still runs. Anyone clearing `_work/` has to move the downloader to the portal's
CKAN API (`datastore_search`), which is not challenged. See
`indicadors.SOURCES.md`.

---

nginx + git-sync on a K3s homelab. Pages must be self-contained static HTML —
no server-side code.
