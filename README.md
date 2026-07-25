# simple-webs

Static web pages hosted at **[webs.raular.com](https://webs.raular.com/)**.

The home page is a showcase that lists every page in this repo automatically,
each with a live preview.

## Add a page

Just commit an `.html` file and push:

```sh
git add my-page.html
git commit -m "add my page"
git push
```

It appears on the home page within a few seconds. No build step.

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
