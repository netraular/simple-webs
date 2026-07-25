# simple-webs

Static web pages hosted at **[webs.raular.com](https://webs.raular.com/)**.

The home page is a showcase that lists every page under `pages/` automatically,
each with a live preview.

## Layout

```
index.html      showcase landing (auto-discovers pages/)
webs.json       optional per-page title & description
favicon.ico     default tab icon for pages that define none
pages/          the published pages — one .html each
```

## Add a page

Drop a self-contained `.html` into `pages/` and push:

```sh
git add pages/my-page.html
git commit -m "add my page"
git push
```

It appears on the home page within a few seconds, at
`https://webs.raular.com/pages/my-page.html`. No build step.

## Optional: nicer title & description

Add an entry to `webs.json` (falls back to the filename if missing):

```json
{
  "my-page.html": {
    "title": "My Page",
    "description": "What this page does."
  }
}
```

---

Served by nginx + git-sync on a K3s homelab. Pages must be self-contained static
HTML (no server-side code).
