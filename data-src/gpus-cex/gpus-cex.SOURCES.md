# GPUs CeX: sources and methodology

## Capture

- CeX Spain, category 887, **21 October 2026**, recorded at 11:18:57 UTC.
- [Original category](https://es.webuy.com/search/?categoryIds=887&categoryName=tarjetas-graficas-pci-e).
- Read the rendered public listing, pages **1-6**, 17 offers per page, 102 results.
  Page URLs use `page=1` through `page=6` alongside `categoryIds=887` and
  `categoryName=tarjetas-graficas-pci-e`. `cex-snapshot.json` preserves listing
  order, so the builder retains each offer's source page.
- Prices are the EUR **sale prices**, not CeX cash or voucher purchase offers.
  The out-of-stock toggle was left off. Listing inclusion is not a verification
  of home delivery or individual shop inventory. No stock quantity is inferred.
- The initial two product-photo URLs were read from their product pages. The
  optional `--check-images` step checks the corresponding CeX CDN path for each
  offer ID with **HTTP HEAD only** and records a URL only after an HTTP success
  and an `image/*` content type. Redirects outside the CeX CDN are rejected.
  `imagesCheckedAt` is separate from the price-capture timestamp. The current
  snapshot has **98 verified remote-photo URLs for 102 offers**.
- Photos remain on `es.static.webuy.com`; neither the checker nor the build
  downloads or saves image bodies. The browser fetches them directly with lazy
  loading, asynchronous decoding and no referrer. They are catalogue illustrations,
  not photographs of individual used units. HEAD checks availability and content
  type, not the visual contents; future removal or hotlink blocking remains possible.
- Cards, the alternative table view, the leading offer and the three-GPU comparison
  share the same remote URLs. Fixed photo areas retain their dimensions on failure;
  absent or failed images display `Sin imagen`. Failed URLs are remembered for the
  page session so changing filters does not repeatedly request broken images.
- The GTX 1070 and MSI RTX 5050 product pages additionally confirmed 120 EUR
  and 225 EUR, respectively, and online stock at capture time. That observation
  is not extrapolated to the other offers or exposed as live inventory.

## Performance

- [PassMark high-end chart](https://www.videocardbenchmark.net/high_end_gpus.html)
  and [mid-range chart](https://www.videocardbenchmark.net/mid_range_gpus.html),
  consulted **21 October 2026**.
- `benchmarks.json` contains only selected factual **average G3D Mark** values,
  model names and reference IDs. No review text, chart artwork, dollar prices,
  percentage bars or CeX customer-star ratings are reused as performance data.
- [Test methodology](https://www.videocardbenchmark.net/gpu_test_info.html).
  G3D Mark combines DirectX and GPU compute tests from user submissions. This is
  a synthetic reference across different host PCs, **not gaming FPS**, a specific
  resolution, or a controlled comparison of these used units. It does not rank
  ray tracing, upscaling, AI work, video encoding or driver longevity separately.
- Match desktop GPU family, Ti/SUPER/XT/X suffix and memory where the reference
  separates it. RTX 3050 6 GB, RTX 3060 8/12 GB, GTX 1060 3/6 GB and RTX 3080
  10 GB have separate explicit mappings; a future unmatched capacity is not
  assigned a score from a different capacity.
- A null reference capacity means PassMark does not split the reference by
  memory/revision. The page explicitly marks it as **grouped**, including RX 580,
  RX 560, GTX 1650, GTX 960 and the combined **RX 470/570** reference. These are
  approximate family references, not separately measured memory variants.
- CeX names are retained as published, including potentially questionable memory
  labels. Unknown names and external/mobile GPU enclosures are not fuzzily
  matched to desktop GPUs. There are **87 matched offers and 15 unscored offers**.
  Unscored offers remain accessible, but cannot win the value ranking.

## Calculation

`value = average G3D Mark / CeX sale price in EUR`.

Descending value ranks the offers. Ties prefer the cheaper offer, then CeX ID.
Grouping keeps the cheapest offer of the same family, capacity and explicitly
named memory type. An omitted memory type is not silently inferred. An unknown
family keeps its own CeX ID, so unrecognized models never collapse together.
Grouping runs after search/price/memory/performance filters. All original offers
are available by disabling grouping. A selected product remains in the comparison
even when later filters hide it from the ranking.

An offer is dominated if another in the filtered set is no dearer and scores at
least as much, with at least one strict improvement. This frontier considers
**only price and score**, not VRAM, drivers, features, power draw or condition.
Shipping, electricity and replacement PSU costs are not included. Very old cards
can lead points per euro without being suitable purchases for modern games.

## Rebuild And Refresh

```sh
node data-src/gpus-cex/build-gpus.mjs
node data-src/gpus-cex/test-gpus.mjs
```

To recheck remote-photo URLs without downloading any image files:

```sh
node data-src/gpus-cex/build-gpus.mjs --check-images
node data-src/gpus-cex/test-gpus.mjs
```

This checks up to four URLs concurrently, rejects HTML/error responses, updates
only photo metadata in the source snapshot and rebuilds the published data. If no
image verifies, it aborts without overwriting the source capture. Review the photo
coverage assertion if the available images change. It does not refresh prices or
performance scores.

The default build without `--check-images` and its tests operate on the **recorded
snapshot offline**. Neither mode downloads current prices. `capturedAt` and
`benchmarkCheckedAt` come from the source captures, never from the rebuild time.
`generatedAt` is separate.

To refresh, re-read all CeX result pages with the same filters, record their
total count, prices, names, IDs and capture time in `cex-snapshot.json`; update
the selected PassMark values and consultation date in `benchmarks.json`, then
rebuild and test. Review the coverage assertions when the catalogue changes.
Do not merely change dates on old observations.

Direct requests to the CeX public boxes endpoint and PassMark returned HTTP 403
in this environment; the downloaded CeX HTML only contained the application
shell. The captures were obtained through rendered-page text extraction, without
browser automation or bypassing access controls. There is intentionally **no
live-refresh button, unattended scraper or automatic freshness claim**.