// ── ChatFaces Content Script ──
// Sets background via CSS custom properties on <html>.
// Uses ::before pseudo-element for fade animation.

const ACTIVE_CLASS = "chatfaces-active";

// ── Detect which site we're on ──
function detectSite() {
  const host = location.hostname;
  if (host === "chatgpt.com" || host === "chat.openai.com") return "chatgpt";
  if (host === "claude.ai") return "claude";
  if (host === "gemini.google.com") return "gemini";
  return null;
}

// ── Resolve the image URL (bundled preset or custom data URL) ──
function resolveImageUrl(bgName, callback) {
  if (bgName === "custom") {
    chrome.storage.local.get("chatfaces_custom_data", (data) => {
      callback(data.chatfaces_custom_data || null);
    });
  } else {
    callback(chrome.runtime.getURL(`backgrounds/${bgName}.png`));
  }
}

const html = document.documentElement;

// ── Fade helpers ──
function fadeIn() {
  html.style.setProperty("--chatfaces-opacity", "1");
}

function fadeOut() {
  return new Promise((resolve) => {
    html.style.setProperty("--chatfaces-opacity", "0");
    // Wait for the transition to finish
    const onEnd = () => {
      html.removeEventListener("transitionend", onEnd);
      resolve();
    };
    html.addEventListener("transitionend", onEnd);
    // Fallback timeout in case transitionend doesn't fire
    setTimeout(resolve, 2200);
  });
}

// ── Set the background image on the ::before pseudo-element ──
// For data URLs (custom), inject a <style> tag since CSS vars can choke on long values.
let customStyleEl = null;

function setBgImage(url) {
  // Try CSS variable first (works for short extension URLs)
  html.style.setProperty("--chatfaces-bg", `url("${url}")`);

  // For data URLs, also inject a direct style override to be safe
  if (url.startsWith("data:")) {
    if (!customStyleEl) {
      customStyleEl = document.createElement("style");
      customStyleEl.id = "chatfaces-custom-style";
      document.head.appendChild(customStyleEl);
    }
    customStyleEl.textContent = `html.chatfaces-active::before { background-image: url("${url}") !important; }`;
  } else {
    // Remove injected style if switching back to a preset
    if (customStyleEl) {
      customStyleEl.textContent = "";
    }
  }
}

function clearBgImage() {
  html.style.removeProperty("--chatfaces-bg");
  if (customStyleEl) {
    customStyleEl.textContent = "";
  }
}

// ── Apply background ──
async function applyBackground(bgName) {
  if (!bgName) {
    removeBackground();
    return;
  }

  const isAlreadyActive = html.classList.contains(ACTIVE_CLASS);

  resolveImageUrl(bgName, async (url) => {
    if (!url) return;

    if (isAlreadyActive) {
      // Switching: fade out, swap image, fade in
      await fadeOut();
      setBgImage(url);
      const img = new Image();
      img.onload = () => requestAnimationFrame(() => fadeIn());
      img.src = url;
    } else {
      // First apply: set image, add class, then fade in
      setBgImage(url);
      html.classList.add(ACTIVE_CLASS);
      const img = new Image();
      img.onload = () => requestAnimationFrame(() => fadeIn());
      img.src = url;
    }
  });
}

// ── Remove background ──
async function removeBackground() {
  if (!html.classList.contains(ACTIVE_CLASS)) return;

  await fadeOut();
  html.classList.remove(ACTIVE_CLASS);
  clearBgImage();
  html.style.removeProperty("--chatfaces-opacity");
}

// ── Initialize ──
function init() {
  const site = detectSite();
  if (!site) return;

  html.setAttribute("data-chatfaces-site", site);

  chrome.storage.sync.get("chatfaces_bg", (data) => {
    applyBackground(data.chatfaces_bg || null);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.chatfaces_bg) {
      applyBackground(changes.chatfaces_bg.newValue || null);
    }
  });
}

if (document.body) {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}
