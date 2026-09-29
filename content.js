const ACTIVE_CLASS = "chatfaces-active";
const STYLE_ACTIVE_CLASS = "chatfaces-style-active";
const BACKGROUND_KEY = "chatfaces_bg";
const CUSTOM_BACKGROUND_DATA_KEY = "chatfaces_custom_data";
const SOLID_BACKGROUND_COLOR_KEY = "chatfaces_solid_color";
const STYLE_SETTINGS_KEY = "chatfaces_ui_settings";
const DEFAULT_SOLID_BACKGROUND_COLOR = "#f3efe4";
const SITE_MESSAGE_SELECTORS = {
  chatgpt: {
    user: '[data-user-message-bubble], [data-message-author-role="user"], [data-turn="user"]',
    assistant: '[data-markdown-text-style="assistant-message"], [data-message-author-role="assistant"], [data-turn="assistant"]',
  },
  claude: {
    user: '[data-testid="user-message"], .font-user-message',
    assistant: '[data-testid="assistant-message"], .font-claude-message',
  },
  gemini: {
    user: 'user-query, .user-query, .query-content',
    assistant: 'model-response, message-content, .response-container-content',
  },
  grok: {
    user: '[data-testid="user-message"], [data-message-author-role="user"]',
    assistant: '[data-testid="assistant-message"], [data-message-author-role="assistant"]',
  },
};
// X's React Native Web view has no message-role attributes (verified Sep 2026).
// Keep its observed text-root signatures isolated from grok.com and other sites.
const X_MESSAGE_SELECTORS = {
  user: '[data-testid="user-message"], [data-message-author-role="user"], div.r-37j5jr.r-imh66m.r-1kt6imw',
  assistant: '[data-testid="assistant-message"], [data-message-author-role="assistant"], div[dir].r-37j5jr.r-imh66m:not(.r-1kt6imw)',
};
const SHARED_SECONDARY_SURFACE_SELECTORS = [
  "dialog",
  '[role="dialog"]',
  '[aria-modal="true"]',
  "mat-dialog-container",
  ".mat-mdc-dialog-surface",
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tooltip"]',
  '[data-testid*="document-panel" i]',
  '[data-testid*="document-viewer" i]',
  '[data-testid*="file-preview-panel" i]',
  '[data-testid*="file-viewer" i]',
  '[data-testid*="preview-panel" i]',
  '[data-test-id*="document-panel" i]',
  '[data-test-id*="file-preview-panel" i]',
  '[data-test-id*="preview-panel" i]',
  'section[aria-label*="document preview" i]',
  'aside[aria-label*="document preview" i]',
  '[role="region"][aria-label*="document preview" i]',
  'section[aria-label*="file preview" i]',
  'aside[aria-label*="file preview" i]',
  '[role="region"][aria-label*="file preview" i]',
  '[class*="document-panel" i]',
  '[class*="documentPanel" i]',
  '[class*="file-preview" i]',
  '[class*="filePreview" i]',
  '[class*="preview-panel" i]',
  '[class*="previewPanel" i]',
];
const SITE_SECONDARY_SURFACE_SELECTORS = {
  chatgpt: [
    '[data-testid*="canvas-panel" i]',
    '[data-testid*="canvas-viewer" i]',
    '[data-testid*="canvas-container" i]',
    '[id*="canvas-panel" i]',
    '[id*="canvas-viewer" i]',
    '[id*="canvas-container" i]',
    'section[aria-label*="canvas" i]',
    'aside[aria-label*="canvas" i]',
    '[role="region"][aria-label*="canvas" i]',
    '[class*="canvas-panel" i]',
    '[class*="canvasPanel" i]',
  ],
  claude: [
    '[data-testid*="artifact-panel" i]',
    '[data-testid*="artifact-viewer" i]',
    '[data-testid*="artifact-preview" i]',
    '[id*="artifact-panel" i]',
    '[id*="artifact-viewer" i]',
    '[id*="artifact-container" i]',
    'section[aria-label*="artifact" i]',
    'aside[aria-label*="artifact" i]',
    '[role="region"][aria-label*="artifact" i]',
    '[class*="artifact-panel" i]',
    '[class*="artifactPanel" i]',
  ],
  gemini: [
    "immersive-panel",
    "canvas-panel",
    '[data-testid*="immersive-panel" i]',
    '[data-testid*="canvas-panel" i]',
    '[data-test-id*="immersive-panel" i]',
    '[data-test-id*="canvas-panel" i]',
    '[id*="immersive-panel" i]',
    '[id*="canvas-panel" i]',
    '[id*="canvas-container" i]',
    '[class*="immersive-panel" i]',
    '[class*="immersivePanel" i]',
    '[class*="canvas-panel" i]',
    '[class*="canvasPanel" i]',
  ],
  grok: [
    '[data-testid*="artifact-panel" i]',
    '[data-testid*="file-preview" i]',
    '[data-testid*="document-panel" i]',
    '[data-testid*="media-modal" i]',
    '[id*="file-preview" i]',
    '[id*="document-panel" i]',
    '[class*="artifact-panel" i]',
    '[class*="file-preview" i]',
    '[class*="document-panel" i]',
  ],
};
const DEFAULT_STYLE_SETTINGS = {
  accessibilityPreset: "default",
  userBubbleColor: "#073b32",
  assistantBubbleColor: "#1e1e32",
  textColor: "#ffffff",
  surfaceOpacity: 75,
  backgroundBrightness: 100,
  messageTextSize: 18,
  uiTextScale: 100,
};
const { resolveReadability } = globalThis.ChatFacesReadability;

const html = document.documentElement;
let currentBackground = null;
let customStyleEl = null;
let pageMarkerObserver = null;
let pageMarkerSyncScheduled = false;
let backgroundApplySequence = 0;
let hasStoredStyle = false;
let backgroundReady = false;

function detectSite() {
  const host = location.hostname;
  if (host === "chatgpt.com" || host === "chat.openai.com") return "chatgpt";
  if (host === "claude.ai") return "claude";
  if (host === "gemini.google.com") return "gemini";
  if (host === "grok.com") return "grok";
  if (host === "x.com" && /^\/i\/grok(?:\/|$)/.test(location.pathname)) return "grok";
  return null;
}

function getSiteLabel(site) {
  return {
    chatgpt: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini",
    grok: "Grok",
  }[site] || "the current chat";
}

function getSecondarySurfaceSelector() {
  const site = detectSite();
  return [
    ...SHARED_SECONDARY_SURFACE_SELECTORS,
    ...(SITE_SECONDARY_SURFACE_SELECTORS[site] || []),
  ].join(", ");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();

  return fallback;
}

function normalizeAccessibilityPreset(value) {
  const validPresets = new Set([
    "default",
    "lowVision",
    "largeType",
    "highContrast",
    "warmContrast",
    "paper",
    "custom",
  ]);

  if (typeof value === "string" && validPresets.has(value)) return value;
  return DEFAULT_STYLE_SETTINGS.accessibilityPreset;
}

function normalizeBackgroundChoice(value) {
  const validChoices = new Set([
    "cyber",
    "fantasy",
    "unicorns",
    "custom",
    "solid",
  ]);

  if (typeof value === "string" && validChoices.has(value)) return value;
  return null;
}

function normalizeStyleSettings(settings = {}) {
  if (!settings || typeof settings !== "object") settings = {};
  return {
    accessibilityPreset: normalizeAccessibilityPreset(settings.accessibilityPreset),
    userBubbleColor: normalizeHexColor(
      settings.userBubbleColor,
      DEFAULT_STYLE_SETTINGS.userBubbleColor
    ),
    assistantBubbleColor: normalizeHexColor(
      settings.assistantBubbleColor,
      DEFAULT_STYLE_SETTINGS.assistantBubbleColor
    ),
    textColor: normalizeHexColor(settings.textColor, DEFAULT_STYLE_SETTINGS.textColor),
    surfaceOpacity: clamp(
      Number.isFinite(Number(settings.surfaceOpacity))
        ? Number(settings.surfaceOpacity)
        : DEFAULT_STYLE_SETTINGS.surfaceOpacity,
      25,
      95
    ),
    backgroundBrightness: clamp(
      Number.isFinite(Number(settings.backgroundBrightness))
        ? Number(settings.backgroundBrightness)
        : DEFAULT_STYLE_SETTINGS.backgroundBrightness,
      40,
      140
    ),
    messageTextSize: clamp(
      Number.isFinite(Number(settings.messageTextSize))
        ? Number(settings.messageTextSize)
        : DEFAULT_STYLE_SETTINGS.messageTextSize,
      14,
      28
    ),
    uiTextScale: clamp(
      Number.isFinite(Number(settings.uiTextScale))
        ? Number(settings.uiTextScale)
        : DEFAULT_STYLE_SETTINGS.uiTextScale,
      90,
      140
    ),
  };
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function toRgba(hex, opacity) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(3)})`;
}

function applyStyleSettings(settings) {
  const normalized = normalizeStyleSettings(settings);
  const surfaceOpacity = normalized.surfaceOpacity / 100;
  const readability = resolveReadability(normalized);
  const { surfaces } = readability;
  const messageLineHeight = clamp(
    1.55 + (normalized.messageTextSize - DEFAULT_STYLE_SETTINGS.messageTextSize) * 0.03,
    1.55,
    1.9
  );

  html.style.setProperty(
    "--chatfaces-user-bubble-bg",
    toRgba(normalized.userBubbleColor, surfaces.user.opacity)
  );
  html.style.setProperty(
    "--chatfaces-assistant-bubble-bg",
    toRgba(normalized.assistantBubbleColor, surfaces.assistant.opacity)
  );
  html.style.setProperty(
    "--chatfaces-input-bg",
    toRgba(normalized.assistantBubbleColor, surfaces.input.opacity)
  );
  html.style.setProperty(
    "--chatfaces-sidebar-bg",
    toRgba(normalized.assistantBubbleColor, surfaces.sidebar.opacity)
  );
  html.style.setProperty(
    "--chatfaces-secondary-surface-bg",
    toRgba(normalized.assistantBubbleColor, surfaces.secondary.opacity)
  );
  html.style.setProperty(
    "--chatfaces-secondary-toolbar-bg",
    toRgba(normalized.assistantBubbleColor, surfaces.toolbar.opacity)
  );
  html.style.setProperty(
    "--chatfaces-secondary-code-bg",
    toRgba(normalized.assistantBubbleColor, surfaces.code.opacity)
  );
  html.style.setProperty(
    "--chatfaces-bg-brightness",
    `${(normalized.backgroundBrightness / 100).toFixed(2)}`
  );
  html.style.setProperty("--chatfaces-text-color", surfaces.assistant.textColor);
  html.style.setProperty("--chatfaces-user-text-color", surfaces.user.textColor);
  html.style.setProperty(
    "--chatfaces-assistant-text-color",
    surfaces.assistant.textColor
  );
  html.style.setProperty("--chatfaces-input-text-color", surfaces.input.textColor);
  html.style.setProperty(
    "--chatfaces-secondary-text-color",
    surfaces.secondary.textColor
  );
  html.style.setProperty("--chatfaces-code-text-color", surfaces.code.textColor);
  html.style.setProperty("--chatfaces-toolbar-text-color", surfaces.toolbar.textColor);
  html.style.setProperty(
    "--chatfaces-sidebar-text-color",
    surfaces.sidebar.textColor
  );
  html.setAttribute(
    "data-chatfaces-readability-guard",
    readability.adjustedText || readability.protectedOpacity ? "adjusted" : "safe"
  );
  html.style.setProperty(
    "--chatfaces-message-font-size",
    `${normalized.messageTextSize}px`
  );
  html.style.setProperty(
    "--chatfaces-ui-text-scale",
    `${(normalized.uiTextScale / 100).toFixed(2)}`
  );
  html.style.setProperty(
    "--chatfaces-message-line-height",
    messageLineHeight.toFixed(2)
  );
  html.style.setProperty(
    "--chatfaces-hover-bg",
    `rgba(255, 255, 255, ${clamp(surfaceOpacity * 0.18, 0.06, 0.18).toFixed(2)})`
  );
}

function loadStyleSettings() {
  chrome.storage.local.get(STYLE_SETTINGS_KEY, (data) => {
    hasStoredStyle =
      Object.prototype.hasOwnProperty.call(data, STYLE_SETTINGS_KEY) &&
      data[STYLE_SETTINGS_KEY] != null;

    applyStyleSettings(data[STYLE_SETTINGS_KEY]);
    syncActivation();
  });
}

function syncActivation() {
  const site = detectSite();
  if (site) html.setAttribute("data-chatfaces-site", site);
  else html.removeAttribute("data-chatfaces-site");
  html.classList.toggle(STYLE_ACTIVE_CLASS, Boolean(site && hasStoredStyle));
  html.classList.toggle(ACTIVE_CLASS, Boolean(site && backgroundReady));
}

function setMarker(node, name, value) {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function markSecondarySurfaceNodes() {
  const selector = getSecondarySurfaceSelector();
  document.querySelectorAll(selector).forEach((candidate) => {
    if (candidate.matches("a, button, img, input, svg, textarea")) return;
    if (candidate.parentElement?.closest(selector)) return;
    setMarker(candidate, "data-chatfaces-surface", "secondary");
  });
}

function markMessageRoleNodes() {
  const selectors = location.hostname === "x.com"
    ? X_MESSAGE_SELECTORS : SITE_MESSAGE_SELECTORS[detectSite()];
  const selected = new Map();
  if (selectors) {
    for (const [role, selector] of Object.entries(selectors)) {
      document.querySelectorAll(selector).forEach((node) => {
        // Prefer one content surface; turns need not alternate or contain text only.
        if (node.querySelector(selector)) return;
        if (node.closest('[contenteditable="true"], [data-chatfaces-surface="secondary"]')) return;
        const content = role === "assistant"
          ? node.querySelector('[data-perf-reply-text], .standard-markdown, .markdown') || node
          : node;
        selected.set(content, role);
      });
    }
  }
  document.querySelectorAll("[data-chatfaces-bubble]").forEach((node) => {
    if (selected.has(node)) return;
    node.removeAttribute("data-chatfaces-bubble");
    node.removeAttribute("data-chatfaces-role");
    node.removeAttribute("data-chatfaces-marker-source");
  });
  selected.forEach((role, node) => {
    setMarker(node, "data-chatfaces-bubble", "true");
    setMarker(node, "data-chatfaces-role", role);
  });
}

function markInterfaceSurfaces() {
  const groups = {
    sidebar: 'nav[aria-label="Chat history"], [aria-label="Sidebar"], [aria-label="Side Navigation"], .sidebar-navigation, [data-testid="sidebar"], [data-sidebar="sidebar"], mat-sidenav, nav',
    composer: '[data-composer-surface-variant], [data-tap-focuses-field]:has([data-testid="chat-input"]), form:has(textarea), form:has([contenteditable="true"]), fieldset:has([contenteditable="true"]), .input-area-container, rich-textarea, .query-bar',
    toolbar: 'header, [data-testid="message-actions"], .action-buttons',
  };
  for (const [kind, selector] of Object.entries(groups)) {
    document.querySelectorAll(selector).forEach((node) => {
      if (node.closest('[data-chatfaces-bubble], [data-chatfaces-surface="secondary"]')) return;
      if (node.parentElement?.closest(selector)) return;
      setMarker(node, "data-chatfaces-surface", kind);
    });
  }
  // Some composers (notably X) do not use a form. Stop at their own controls.
  document.querySelectorAll('textarea, [contenteditable="true"][role="textbox"]').forEach((editor) => {
    if (editor.closest('[data-chatfaces-surface], [data-chatfaces-bubble]')) return;
    let surface = editor;
    for (let parent = editor.parentElement, depth = 0;
      parent && parent !== document.body && depth < 6;
      parent = parent.parentElement, depth += 1) {
      if (parent.querySelector('[data-chatfaces-bubble], [data-chatfaces-surface]')) break;
      if (parent.querySelector('button')) { surface = parent; break; }
    }
    setMarker(surface, "data-chatfaces-surface", "composer");
  });
}

function syncPageMarkers() {
  syncActivation();
  if (!detectSite()) return;
  // Reconcile reused nodes when streaming or client-side navigation changes roles.
  document.querySelectorAll("[data-chatfaces-surface]").forEach((node) => {
    node.removeAttribute("data-chatfaces-surface");
  });
  markSecondarySurfaceNodes();
  markMessageRoleNodes();
  markInterfaceSurfaces();

  const shells = new Set();
  document.querySelectorAll("[data-chatfaces-bubble], [data-chatfaces-surface]").forEach((node) => {
    for (let parent = node.parentElement; parent && parent !== html; parent = parent.parentElement) {
      if (parent.matches("[data-chatfaces-bubble], [data-chatfaces-surface]")) break;
      shells.add(parent);
    }
  });
  document.querySelectorAll("[data-chatfaces-shell]").forEach((node) => {
    if (!shells.has(node)) node.removeAttribute("data-chatfaces-shell");
  });
  shells.forEach((node) => setMarker(node, "data-chatfaces-shell", "true"));
}

function schedulePageMarkerSync() {
  if (pageMarkerSyncScheduled) return;
  pageMarkerSyncScheduled = true;
  requestAnimationFrame(() => {
    pageMarkerSyncScheduled = false;
    syncPageMarkers();
  });
}

function startPageMarkerObserver() {
  if (pageMarkerObserver) return;
  syncPageMarkers();
  pageMarkerObserver = new MutationObserver(schedulePageMarkerSync);
  pageMarkerObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-message-author-role", "data-testid", "data-test-id", "data-turn", "data-user-message-bubble", "data-markdown-text-style", "data-perf-reply-text", "class", "dir", "role", "aria-label", "aria-modal", "open"],
    childList: true,
    subtree: true,
  });
  window.addEventListener("popstate", schedulePageMarkerSync);
  window.addEventListener("hashchange", schedulePageMarkerSync);
}

function validCustomImage(value) {
  return typeof value === "string" && /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value);
}

function resolveBackgroundSource(bgName) {
  const normalizedBackground = normalizeBackgroundChoice(bgName);

  if (!normalizedBackground) {
    return Promise.resolve(null);
  }

  if (normalizedBackground === "custom") {
    return new Promise((resolve) => {
      chrome.storage.local.get(CUSTOM_BACKGROUND_DATA_KEY, (data) => {
        resolve({
          type: "image",
          value: validCustomImage(data[CUSTOM_BACKGROUND_DATA_KEY]) ? data[CUSTOM_BACKGROUND_DATA_KEY] : null,
        });
      });
    });
  }

  if (normalizedBackground === "solid") {
    return new Promise((resolve) => {
      chrome.storage.local.get(SOLID_BACKGROUND_COLOR_KEY, (data) => {
        resolve({
          type: "solid",
          value: normalizeHexColor(
            data[SOLID_BACKGROUND_COLOR_KEY],
            DEFAULT_SOLID_BACKGROUND_COLOR
          ),
        });
      });
    });
  }

  return Promise.resolve({
    type: "image",
    value: chrome.runtime.getURL(`backgrounds/${normalizedBackground}.jpg`),
  });
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function fadeIn() {
  html.style.setProperty("--chatfaces-opacity", "1");
}

function fadeOut() {
  html.style.setProperty("--chatfaces-opacity", "0");
  if (prefersReducedMotion()) return Promise.resolve();

  return new Promise((resolve) => {
    let timeoutId;

    const finish = () => {
      html.removeEventListener("transitionend", onEnd);
      clearTimeout(timeoutId);
      resolve();
    };

    const onEnd = (event) => {
      if (event.target !== html || event.propertyName !== "opacity") return;
      finish();
    };

    html.addEventListener("transitionend", onEnd);
    timeoutId = setTimeout(finish, 2200);
  });
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Background image failed to load."));
    image.src = url;
  });
}

function setBgImage(url) {
  html.style.setProperty("--chatfaces-bg-color", "#0a0a14");

  if (url.startsWith("data:")) {
    html.style.setProperty("--chatfaces-bg-image", "none");

    if (!customStyleEl) {
      customStyleEl = document.createElement("style");
      customStyleEl.id = "chatfaces-custom-style";
      document.head.appendChild(customStyleEl);
    }

    customStyleEl.textContent =
      `html.chatfaces-active::before { background-image: url("${url}") !important; }`;
  } else if (customStyleEl) {
    customStyleEl.textContent = "";
    html.style.setProperty("--chatfaces-bg-image", `url("${url}")`);
  } else {
    html.style.setProperty("--chatfaces-bg-image", `url("${url}")`);
  }
}

function setBgSolid(color) {
  html.style.setProperty("--chatfaces-bg-image", "none");
  html.style.setProperty(
    "--chatfaces-bg-color",
    normalizeHexColor(color, DEFAULT_SOLID_BACKGROUND_COLOR)
  );

  if (customStyleEl) {
    customStyleEl.textContent = "";
  }
}

function clearBgImage() {
  html.style.removeProperty("--chatfaces-bg-image");
  html.style.removeProperty("--chatfaces-bg-color");
  if (customStyleEl) {
    customStyleEl.textContent = "";
  }
}

async function applyBackground(bgName) {
  const requestId = ++backgroundApplySequence;
  const nextBackground = normalizeBackgroundChoice(bgName);
  currentBackground = nextBackground;

  if (!nextBackground) {
    await removeBackground(requestId);
    return;
  }

  const source = await resolveBackgroundSource(nextBackground);
  if (requestId !== backgroundApplySequence) return;
  if (!source?.value) {
    await removeBackground(requestId);
    return;
  }

  const isAlreadyActive = html.classList.contains(ACTIVE_CLASS);
  if (isAlreadyActive) await fadeOut();
  if (requestId !== backgroundApplySequence) return;

  if (source.type === "solid") {
    setBgSolid(source.value);
    backgroundReady = true;
    syncActivation();
    requestAnimationFrame(() => {
      if (requestId === backgroundApplySequence) fadeIn();
    });
    return;
  }

  try {
    await preloadImage(source.value);
  } catch {
    if (requestId === backgroundApplySequence) {
      await removeBackground(requestId);
    }
    return;
  }
  if (requestId !== backgroundApplySequence) return;

  setBgImage(source.value);
  backgroundReady = true;
  syncActivation();
  requestAnimationFrame(() => {
    if (requestId === backgroundApplySequence) fadeIn();
  });
}

async function removeBackground(requestId = ++backgroundApplySequence) {
  if (requestId !== backgroundApplySequence) return;

  if (!html.classList.contains(ACTIVE_CLASS)) {
    backgroundReady = false;
    clearBgImage();
    html.style.removeProperty("--chatfaces-opacity");
    return;
  }

  await fadeOut();
  if (requestId !== backgroundApplySequence) return;

  backgroundReady = false;
  syncActivation();
  clearBgImage();
  html.style.removeProperty("--chatfaces-opacity");
}

function init() {
  const site = detectSite();
  if (!site) return;

  html.setAttribute("data-chatfaces-site", site);
  loadStyleSettings();

  startPageMarkerObserver();

  chrome.storage.sync.get(BACKGROUND_KEY, (data) => {
    applyBackground(data[BACKGROUND_KEY] || null);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[BACKGROUND_KEY]) {
      applyBackground(changes[BACKGROUND_KEY].newValue || null);
    }

    if (area === "local" && changes[STYLE_SETTINGS_KEY]) {
      hasStoredStyle = changes[STYLE_SETTINGS_KEY].newValue != null;
      applyStyleSettings(changes[STYLE_SETTINGS_KEY].newValue);
      syncActivation();
    }

    if (
      area === "local" &&
      changes[CUSTOM_BACKGROUND_DATA_KEY] &&
      currentBackground === "custom"
    ) {
      applyBackground("custom");
    }

    if (
      area === "local" &&
      changes[SOLID_BACKGROUND_COLOR_KEY] &&
      currentBackground === "solid"
    ) {
      applyBackground("solid");
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "chatfaces:apply-style-settings") return;
    if (!detectSite()) return;

    hasStoredStyle = true;
    applyStyleSettings(message.settings);
    syncPageMarkers();
    sendResponse({ ok: true, siteLabel: getSiteLabel(site) });
  });
}

if (document.body) {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}
