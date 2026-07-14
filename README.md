# Signal — QR Code Generator

A single-file, browser-based QR code generator and scanner with a scanner/blueprint visual style. No build step, no server, no dependencies to install — just open the HTML file.

## Running it

Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge). That's it — the page loads the QR encoding/decoding libraries from a CDN and runs entirely client-side.

No internet connection is required after the page has loaded once, except for the initial CDN fetch of the QR libraries and fonts.

The **Scan** tab requires camera access, which browsers only grant on a secure context (`https://` or `http://localhost`). Opening the file directly (`file://...`) will block the camera — serve it locally instead, e.g.:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000/index.html`.

## Features

### Generate tab
- **Live encoding** — turn any text, URL, contact info, etc. into a QR code
- **Color customization** — pick the module ("ink") color and background ("base") color
- **Size presets** — 180px, 256px, 320px, or 512px output
- **Error correction levels** — L (7%), M (15%), Q (25%), H (30%); higher levels make the code more resistant to damage or obstruction at the cost of density
- **PNG download** — save the generated code as an image file
- **Scan animation** — a visual scan-line sweep plays each time a code is generated

### Scan tab
- **Live camera scanning** — decode any QR code using your device's camera
- **Smart content detection** — the result automatically adapts to what was scanned:
  - **Wi-Fi credentials** — shows network name, masked password (with show/hide and copy), security type, and an "Open Wi-Fi settings" shortcut. Browsers can't join a network automatically, but this skips retyping the credentials.
  - **Links** — shows the URL with an "Open link" button
  - **Email addresses** — shows the address with a "Compose email" button
  - **Phone numbers** — shows the number with a "Call number" button
  - **Anything else** (plain text, JSON, etc.) — shows the raw decoded content with a Copy button
- **Copy to clipboard** — one-tap copy for decoded values
- **Scan another code** — reset and rescan without re-opening the camera

## Usage

**Generate:**
1. Type or paste the content you want to encode into the text box.
2. Optionally adjust colors, size, and error correction level.
3. Click **Generate code**.
4. Click **Download PNG** to save the image.

Keyboard shortcut: `Cmd/Ctrl + Enter` while focused in the text box also triggers generation.

**Scan:**
1. Switch to the **Scan** tab.
2. Click **Start camera** and grant permission when prompted.
3. Point the camera at a QR code — it decodes automatically.
4. Use the shortcut button (Open link / Compose email / Call number / Open Wi-Fi settings) or copy the content, then click **Scan another code** to go again.

## Privacy

All encoding and decoding happens locally in your browser using the `qrcodejs` and `jsQR` libraries. Nothing you type, generate, or scan is sent to a server.

## Tech stack

- Plain HTML, CSS, and JavaScript (no framework, no build tools)
- [qrcodejs](https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js) via CDN for QR encoding
- [jsQR](https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.js) via CDN for QR decoding from the camera feed
- Google Fonts: Space Grotesk (display), JetBrains Mono (technical/utility text), Inter (body)

## File

- `index.html` — the entire app (structure, styling, and logic in one file)
