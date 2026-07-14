# Security notes for Signal — QR Code Generator

## The short version

This app has no server, no database, and no network calls of its own —
everything (generating and scanning QR codes) happens in the visitor's
browser, and nothing is ever sent anywhere. That was already true before
these changes and I verified it directly (no `fetch`, `XMLHttpRequest`,
`WebSocket`, cookies, or storage calls anywhere in the code). So there is
no "database to break into." The realistic risk for a page like this is
someone tampering with the two third-party JS libraries it loads from a
CDN, or an injected `<script>` doing something unwanted — both of which
the changes below address.

## What was changed in index.html

1. **Subresource Integrity (SRI)** added to the CDN `<script>` tags. This
   makes the browser refuse to run the file if its bytes don't match what
   was expected — protects against a compromised/tampered CDN response.
   - `qrcode.min.js`: hash added and cross-checked against multiple
     independent public repos pinning this exact cdnjs 1.0.0 file.
   - `jsQR.js`: **hash intentionally left out** — I could not
     independently verify it with confidence, and a wrong hash silently
     breaks the scanner (browser blocks the script). Generate the real
     one yourself and add it before you consider this "done":

     ```
     curl -s https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.js | openssl dgst -sha512 -binary | openssl base64 -A
     ```

     Then add to that `<script>` tag:
     `integrity="sha512-<paste the output here>"`

     (Same command pattern works to double-check the qrcode.min.js hash
     too, or to re-generate SRI hashes any time you change library
     versions.)

2. **Content-Security-Policy** meta tag — restricts scripts/styles/fonts
   to only this page and the two CDNs it actually needs, blocks
   `<object>`/`<embed>`, blocks form submissions (there are none), and
   documents intended clickjacking protection (see caveat below).

3. **Referrer-Policy: no-referrer** — the page never needs to send its
   own URL to another site.

4. `crossorigin="anonymous"` + `referrerpolicy="no-referrer"` added to
   both CDN script tags (required for SRI to work, and avoids leaking
   this page's URL to the CDN via the Referer header).

## Important caveat: some protections need the SERVER, not just the HTML

Three real protections **cannot be set from inside index.html at all** —
browsers only honor them as actual HTTP response headers, not `<meta>`
tags:

- `X-Frame-Options` / the `frame-ancestors` CSP directive (clickjacking
  protection — stops someone embedding your page in a hidden iframe)
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (forces HTTPS)
- `Permissions-Policy` (reliable support is header-only)

I've included ready-to-use header configs for the most common static
hosts:

- **Netlify** → drop `_headers` (already in this folder) into your site
  root next to `index.html`. Netlify picks it up automatically, no
  config needed.
- **Vercel** → rename `vercel.json` (already in this folder) and put it
  in your project root.
- **GitHub Pages** → GitHub Pages does **not** let you set custom
  response headers at all. If you need `frame-ancestors`/HSTS/etc.
  enforced, put GitHub Pages behind Cloudflare (free tier) and add the
  headers there via a Cloudflare "Transform Rule" / Page Rule, or move
  to Netlify/Vercel/Cloudflare Pages instead.
- **Cloudflare Pages** → Add a `_headers` file identical to the Netlify
  one above — Cloudflare Pages supports the same format.
- **Apache** → add to `.htaccess`:
  ```
  Header always set X-Frame-Options "DENY"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "no-referrer"
  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
  ```
- **Nginx** — add inside your `server {}` block:
  ```
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "no-referrer" always;
  add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
  ```

## Before you consider this "can't be broken into"

- [ ] Serve it over **HTTPS only** (any static host above does this by
      default; if self-hosting, get a TLS cert — Let's Encrypt is free).
- [ ] Add the matching header file/config for whichever host you use
      (above) — the `<meta>` tags in index.html don't cover everything.
- [ ] Generate and add the real jsQR SRI hash (command above) instead of
      leaving it unpinned.
- [ ] If you ever add a backend, form, login, or any place user input
      gets stored or echoed back to other users, that's a different
      threat model entirely and would need its own review — everything
      here assumes the app stays a static, no-backend tool.
