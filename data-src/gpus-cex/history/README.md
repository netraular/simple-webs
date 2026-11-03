# CeX GPU capture history

Each directory is named after the original capture timestamp in UTC, with colons
replaced by hyphens. It preserves these files together before a price refresh:

- `cex-snapshot.json`: original CeX IDs, names, EUR sale prices and image metadata.
- `benchmarks.json`: performance references used for that capture.
- `gpus-cex.json`: the published catalogue, including matching and ranking inputs.

Keep existing captures unchanged. Before replacing the current source capture,
archive all three current files under its `capturedAt` timestamp, not the date of
the refresh. This keeps removed products and previous prices available for future
comparisons, without treating a change in performance references as a price change.