# data-src

Scripts and raw sources that generate `pages/data/`, one folder per web. Each
folder is self-contained: its scripts resolve paths relative to themselves, write
into `../../pages/data/`, and keep their download cache in their own `_work/`
(git-ignored).

| Folder | Feeds | Writes to `pages/data/` | Run |
|---|---|---|---|
| [`mercados/`](mercados/) | `sp500-rendimientos.html`, `invertir-ya-o-esperar.html` | `mercados.json` | `node build-mercados.mjs` · `node test-mercados.mjs` |
| [`donde-vivir-barcelona/`](donde-vivir-barcelona/) | `donde-vivir-barcelona.html` | `zonas*.json`, `rutas.json`, `iso-*.json`, `linies.json` and the pipeline inputs | ordered pipeline, see the root [`README.md`](../README.md#data-files) |
| [`comparador-paises/`](comparador-paises/) | `comparador-paises.html` | — (data lives inside the page) | `node test-comparador.mjs` |

`fire-calculator.html` and `calculadora-estilo-vida.html` have no data pipeline.

A new web with data gets its own folder here, with a `build-*` script, a
`test-*` check and a `*.SOURCES.md`.
