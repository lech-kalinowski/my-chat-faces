# My Chat Faces

A Chrome extension that lets you set custom background images on AI chat interfaces — **ChatGPT**, **Claude**, and **Gemini**.

Pick from three built-in backgrounds (Cyber, Fantasy, Unicorns) or upload your own image. Your choice persists across sessions, and backgrounds apply automatically every time you visit a supported site.

<img width="1220" height="1122" alt="Screenshot 2026-02-06 at 14 06 02" src="https://github.com/user-attachments/assets/5a6967c9-0c72-4a91-88f3-7d2156e86ee5" />

## Features

- **3 built-in backgrounds** — Cyber, Fantasy, and Unicorns
- **Upload your own** — use any image from your computer
- **Smooth fade-in animation** — backgrounds appear with a 2-second transition
- **Per-message readability** — chat messages get a dark translucent panel so text stays readable
- **Live switching** — change backgrounds from the popup without reloading the page
- **Persistent** — your choice is saved and reapplied automatically
- **Supports 3 AI chat sites:**
  - [ChatGPT](https://chatgpt.com) (`chatgpt.com` / `chat.openai.com`)
  - [Claude](https://claude.ai) (`claude.ai`)
  - [Gemini](https://gemini.google.com) (`gemini.google.com`)

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the project folder
5. Pin the extension from the puzzle-piece menu in the toolbar

## Usage

1. Visit ChatGPT, Claude, or Gemini
2. Click the **My Chat Faces** icon in the Chrome toolbar
3. Pick a background or click **+** to upload your own
4. Click **Remove Background** to revert to the default look

To change a previously uploaded custom image, hover over the Custom card and click **Change**.

## Project Structure

```
├── manifest.json        # Chrome extension manifest (Manifest V3)
├── popup.html           # Popup UI markup
├── popup.css            # Popup styles
├── popup.js             # Popup logic — reads/writes chrome.storage
├── content.js           # Content script — injects background on AI sites
├── content.css          # Background layer + per-message readability styles
├── backgrounds/         # Built-in background images
│   ├── cyber.png
│   ├── fantasy.png
│   └── unicorns.png
└── icons/               # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## How It Works

- The popup saves your background choice to `chrome.storage.sync` (preset name) or `chrome.storage.local` (custom image data URL)
- A content script runs on supported AI chat sites, reads the saved choice, and injects a fixed full-screen `div` behind the page content with the selected background image
- Site-specific CSS overrides make native page backgrounds transparent so the custom background shows through
- Each chat message gets a dark semi-transparent panel for readability
- The content script listens for storage changes so switching backgrounds in the popup updates the page live

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is licensed under the [MIT License](LICENSE).
