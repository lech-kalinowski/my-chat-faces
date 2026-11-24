# My Chat Faces

A Chrome extension that lets you set custom backgrounds on AI chat interfaces — **ChatGPT**, **Claude**, **Gemini**, and **Grok**.

Pick from three built-in backgrounds (Cyber, Fantasy, Unicorns), switch to a solid color, or upload your own image. Your choice persists across sessions, and backgrounds apply automatically every time you visit a supported site.

**Version 1.3.11:** follows ChatGPT's November workspace change so its new backdrop no longer hides wallpapers, and protects the updated home greeting over images. Includes the earlier popup connection fix without new permissions. See [release notes and verification scope](docs/releases/1.3.11.md).

<img width="1776" height="1188" alt="Screenshot 2026-02-06 at 17 06 52" src="https://github.com/user-attachments/assets/616d0762-8b60-43c8-a0ff-1afd8caa4a00" />

## Features

- **3 built-in backgrounds** — Cyber, Fantasy, and Unicorns
- **Solid color backgrounds** — switch to a clean flat color for focused reading
- **Upload your own** — use an image from your computer; large files are optimized automatically for reliable storage
- **Smooth fade-in animation** — backgrounds appear with a 2-second transition
- **Per-message readability** — chat messages get a dark translucent panel so text stays readable
- **Always-on Readability Guard** — unsafe text/surface combinations are corrected per message, input, sidebar, and document window to maintain at least 4.5:1 contrast
- **Custom chat styling** — adjust bubble colors, text color, panel opacity, and background brightness
- **Themed document windows** — supported Canvas, Artifact, markdown, dialog, and file-preview containers inherit your colors and readability settings. Embedded cross-origin apps and PDF viewers retain their native content styling.
- **Accessibility controls** — increase message text size, scale interface text, and switch between Low Vision, Balanced, Large Type, High Contrast, Warm Contrast, and Paper presets
- **Clear status feedback** — see whether changes applied, were saved for later, or need a page refresh
- **Reduced-motion support** — background transitions respect the browser's motion preference
- **Live switching** — change backgrounds from the popup without reloading the page
- **Persistent** — your choice is saved and reapplied automatically
- **Supports 4 AI chat sites:**
  - [ChatGPT](https://chatgpt.com) (`chatgpt.com` / `chat.openai.com`)
  - [Claude](https://claude.ai) (`claude.ai`)
  - [Gemini](https://gemini.google.com) (`gemini.google.com`)
  - [Grok](https://grok.com) (`grok.com` / `x.com/i/grok`)

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the project folder
5. Pin the extension from the puzzle-piece menu in the toolbar

## Usage

1. Visit ChatGPT, Claude, Gemini, or Grok
2. Click the **My Chat Faces** icon in the Chrome toolbar
3. Pick a built-in background, choose a solid color, or click **+** to upload your own
4. Click an accessibility preset for an instant reading mode, or tune text size, chat bubble colors, opacity, and background brightness manually in the popup
5. Click **Apply Style** after manual personalization changes
6. Click **Remove Background** to remove the wallpaper while keeping saved text and color settings

To change a previously uploaded custom image, click **Replace custom image** below the background cards.

## Project Structure

```
├── manifest.json        # Chrome extension manifest (Manifest V3)
├── popup.html           # Popup UI markup
├── popup.css            # Popup styles
├── popup.js             # Popup logic — reads/writes chrome.storage
├── readability.js       # Shared contrast guard used by popup and content scripts
├── content.js           # Content script — injects background on AI sites
├── content.css          # Background layer + per-message readability styles
├── backgrounds/         # Built-in background images
│   ├── cyber.jpg
│   ├── fantasy.jpg
│   └── unicorns.jpg
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── scripts/
    └── build-release.mjs  # Validated Chrome Web Store package builder
```

## How It Works

- The popup saves your background choice to `chrome.storage.sync` (preset name) and uses `chrome.storage.local` for custom image data, solid background color, and chat style settings
- A content script runs on supported AI chat sites, reads the saved choice, and injects a fixed full-screen background layer behind the page content with the selected image or solid color
- Site-specific message detection marks chat surfaces; only their layout ancestors become transparent so the custom background shows through without erasing unrelated cards
- A shared readability engine checks every translucent surface against the full possible background luminance range, preserves safe custom colors, and corrects unsafe text or opacity before rendering
- CSS variables drive role-specific text colors, bubble colors, accessibility sizing, opacity, and brightness so style changes apply live
- The content script listens for storage changes so switching backgrounds in the popup updates the page live

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## Release Build

Build and validate a clean Chrome Web Store archive with:

```bash
node scripts/build-release.mjs
```

The script validates JavaScript syntax, the Chrome manifest description limit,
resource match patterns, required assets, thousands of contrast combinations, secondary-window selector coverage, and archive integrity before writing the ZIP and SHA-256 to `release/chrome-web-store/`.

Run the rendering and popup regression suite before packaging:

```bash
node tests/serve.mjs
```

Open `http://127.0.0.1:8787` and click **Run all tests**. The fixtures cover current and legacy markup, mobile-sized and desktop windows, streaming changes, Paper and Low Vision presets, generated text, and code. ChatGPT tests also decode all built-in images and an uploaded PNG, reproduce its October and November workspace pseudo-elements, check both home-screen greeting layouts, and simulate the popup's missing tab URL. Use `?baseline=1.3.10` (or `?baseline=1.3.9`) to demonstrate regressions against a locally staged previous package. Live site updates still require a separate manual check after loading the new extension and refreshing the chat tabs.

## Roadmap

See the feature release roadmap in [ROADMAP.md](ROADMAP.md).

## License

This project is licensed under the [MIT License](LICENSE).
