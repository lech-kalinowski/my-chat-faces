// ── ChatFaces Content Script ──
// Injects a full-screen background behind AI chat interfaces.
// Per-message readability panels are handled entirely via CSS.

const BG_LAYER_ID = "chatfaces-bg-layer";
const TRANSPARENT_CLASS = "chatfaces-transparent";

// ── Detect which site we're on ──
function detectSite() {
  const host = location.hostname;
  if (host === "chatgpt.com" || host === "chat.openai.com") return "chatgpt";
  if (host === "claude.ai") return "claude";
  if (host === "gemini.google.com") return "gemini";
  return null;
}

// ── Get or create the background layer ──
function getOrCreateLayer() {
  let layer = document.getElementById(BG_LAYER_ID);
  if (!layer) {
    layer = document.createElement("div");
    layer.id = BG_LAYER_ID;
    document.body.prepend(layer);
  }
  return layer;
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

// ── Apply the chosen background with fade-in ──
function applyBackground(bgName) {
  if (!bgName) {
    removeBackground();
    return;
  }

  resolveImageUrl(bgName, (url) => {
    if (!url) return;

    const layer = getOrCreateLayer();

    // If switching backgrounds, fade out first then fade in with new image
    const isAlreadyVisible = layer.classList.contains("chatfaces-visible");
    if (isAlreadyVisible) {
      layer.classList.remove("chatfaces-visible");
      layer.addEventListener("transitionend", function onFadeOut() {
        layer.removeEventListener("transitionend", onFadeOut);
        layer.style.backgroundImage = `url("${url}")`;
        const img = new Image();
        img.onload = () => {
          requestAnimationFrame(() => layer.classList.add("chatfaces-visible"));
        };
        img.src = url;
      }, { once: true });
    } else {
      layer.style.backgroundImage = `url("${url}")`;
      document.body.classList.add(TRANSPARENT_CLASS);
      const img = new Image();
      img.onload = () => {
        requestAnimationFrame(() => layer.classList.add("chatfaces-visible"));
      };
      img.src = url;
    }
  });
}

// ── Remove the background with fade-out ──
function removeBackground() {
  const layer = document.getElementById(BG_LAYER_ID);
  if (!layer) return;

  layer.classList.add("chatfaces-fade-out");
  layer.classList.remove("chatfaces-visible");
  layer.addEventListener("transitionend", function onDone() {
    layer.removeEventListener("transitionend", onDone);
    layer.remove();
    document.body.classList.remove(TRANSPARENT_CLASS);
  }, { once: true });
}

// ── Initialize ──
function init() {
  const site = detectSite();
  if (!site) return;

  // Add site-specific attribute for targeted CSS overrides
  document.documentElement.setAttribute("data-chatfaces-site", site);

  // Read saved background and apply
  chrome.storage.sync.get("chatfaces_bg", (data) => {
    applyBackground(data.chatfaces_bg || null);
  });

  // Listen for live changes from the popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.chatfaces_bg) {
      applyBackground(changes.chatfaces_bg.newValue || null);
    }
  });
}

// Run when the DOM is ready
if (document.body) {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}
