const ACTIVE_CLASS = "chatfaces-active";
const BACKGROUND_KEY = "chatfaces_bg";
const CUSTOM_BACKGROUND_DATA_KEY = "chatfaces_custom_data";
const SOLID_BACKGROUND_COLOR_KEY = "chatfaces_solid_color";
const STYLE_SETTINGS_KEY = "chatfaces_ui_settings";
const DEFAULT_SOLID_BACKGROUND_COLOR = "#f3efe4";
const DEFAULT_STYLE_SETTINGS = {
  accessibilityPreset: "default",
  userBubbleColor: "#227864",
  assistantBubbleColor: "#1e1e32",
  textColor: "#e8e8ee",
  surfaceOpacity: 55,
  backgroundBrightness: 100,
  messageTextSize: 18,
  uiTextScale: 100,
};

const html = document.documentElement;
let currentBackground = null;
let customStyleEl = null;
let chatGptBubbleObserver = null;
let chatGptBubbleSyncScheduled = false;

function detectSite() {
  const host = location.hostname;
  if (host === "chatgpt.com" || host === "chat.openai.com") return "chatgpt";
  if (host === "claude.ai") return "claude";
  if (host === "gemini.google.com") return "gemini";
  if (host === "grok.com") return "grok";
  if (host === "x.com" && location.pathname.startsWith("/i/grok")) return "grok";
  return null;
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
  return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`;
}

function applyStyleSettings(settings) {
  const normalized = normalizeStyleSettings(settings);
  const surfaceOpacity = normalized.surfaceOpacity / 100;
  const elevatedSurfaceOpacity = Math.min(surfaceOpacity + 0.05, 0.95);
  const messageLineHeight = clamp(
    1.55 + (normalized.messageTextSize - DEFAULT_STYLE_SETTINGS.messageTextSize) * 0.03,
    1.55,
    1.9
  );

  html.style.setProperty(
    "--chatfaces-user-bubble-bg",
    toRgba(normalized.userBubbleColor, surfaceOpacity)
  );
  html.style.setProperty(
    "--chatfaces-assistant-bubble-bg",
    toRgba(normalized.assistantBubbleColor, elevatedSurfaceOpacity)
  );
  html.style.setProperty(
    "--chatfaces-input-bg",
    toRgba(normalized.assistantBubbleColor, Math.min(surfaceOpacity + 0.08, 0.95))
  );
  html.style.setProperty(
    "--chatfaces-sidebar-bg",
    toRgba(normalized.assistantBubbleColor, elevatedSurfaceOpacity)
  );
  html.style.setProperty(
    "--chatfaces-bg-brightness",
    `${(normalized.backgroundBrightness / 100).toFixed(2)}`
  );
  html.style.setProperty("--chatfaces-text-color", normalized.textColor);
  html.style.setProperty("--chatfaces-sidebar-text-color", normalized.textColor);
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
    applyStyleSettings(data[STYLE_SETTINGS_KEY]);
  });
}

function getChatGptTurnSelector() {
  return [
    'article[data-testid^="conversation-turn-"]',
    'article[data-testid*="conversation-turn"]',
    'div[data-testid^="conversation-turn-"]',
    'div[data-testid*="conversation-turn"]',
  ].join(", ");
}

function findChatGptBubbleTarget(roleNode) {
  return roleNode.closest(getChatGptTurnSelector()) || roleNode;
}

function clearChatGptBubbleMarkers() {
  document
    .querySelectorAll('[data-chatfaces-bubble="true"]')
    .forEach((node) => {
      node.removeAttribute("data-chatfaces-bubble");
      node.removeAttribute("data-chatfaces-role");
    });
}

function syncChatGptBubbleMarkers() {
  if (detectSite() !== "chatgpt") return;

  clearChatGptBubbleMarkers();

  const roleNodes = document.querySelectorAll(
    '[data-message-author-role="assistant"], [data-message-author-role="user"]'
  );
  const taggedTargets = new Set();

  roleNodes.forEach((roleNode) => {
    const role = roleNode.getAttribute("data-message-author-role");
    if (role !== "assistant" && role !== "user") return;

    const target = findChatGptBubbleTarget(roleNode);
    if (!target || taggedTargets.has(target)) return;

    target.setAttribute("data-chatfaces-bubble", "true");
    target.setAttribute("data-chatfaces-role", role);
    taggedTargets.add(target);
  });

  if (taggedTargets.size > 0) return;

  document
    .querySelectorAll(getChatGptTurnSelector())
    .forEach((turn, index) => {
      turn.setAttribute("data-chatfaces-bubble", "true");
      turn.setAttribute(
        "data-chatfaces-role",
        index % 2 === 0 ? "assistant" : "user"
      );
    });
}

function scheduleChatGptBubbleSync() {
  if (chatGptBubbleSyncScheduled) return;

  chatGptBubbleSyncScheduled = true;
  requestAnimationFrame(() => {
    chatGptBubbleSyncScheduled = false;
    syncChatGptBubbleMarkers();
  });
}

function startChatGptBubbleObserver() {
  if (detectSite() !== "chatgpt" || chatGptBubbleObserver) return;

  scheduleChatGptBubbleSync();

  chatGptBubbleObserver = new MutationObserver(() => {
    scheduleChatGptBubbleSync();
  });

  chatGptBubbleObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function resolveBackgroundSource(bgName, callback) {
  const normalizedBackground = normalizeBackgroundChoice(bgName);

  if (!normalizedBackground) {
    callback(null);
    return;
  }

  if (normalizedBackground === "custom") {
    chrome.storage.local.get(CUSTOM_BACKGROUND_DATA_KEY, (data) => {
      callback({
        type: "image",
        value: data[CUSTOM_BACKGROUND_DATA_KEY] || null,
      });
    });
    return;
  }

  if (normalizedBackground === "solid") {
    chrome.storage.local.get(SOLID_BACKGROUND_COLOR_KEY, (data) => {
      callback({
        type: "solid",
        value: normalizeHexColor(
          data[SOLID_BACKGROUND_COLOR_KEY],
          DEFAULT_SOLID_BACKGROUND_COLOR
        ),
      });
    });
    return;
  }

  callback({
    type: "image",
    value: chrome.runtime.getURL(`backgrounds/${normalizedBackground}.png`),
  });
}

function fadeIn() {
  html.style.setProperty("--chatfaces-opacity", "1");
}

function fadeOut() {
  return new Promise((resolve) => {
    html.style.setProperty("--chatfaces-opacity", "0");

    const onEnd = () => {
      html.removeEventListener("transitionend", onEnd);
      resolve();
    };

    html.addEventListener("transitionend", onEnd);
    setTimeout(resolve, 2200);
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
  currentBackground = normalizeBackgroundChoice(bgName);

  if (!currentBackground) {
    removeBackground();
    return;
  }

  const isAlreadyActive = html.classList.contains(ACTIVE_CLASS);

  resolveBackgroundSource(currentBackground, async (source) => {
    if (!source?.value) return;

    if (isAlreadyActive) {
      await fadeOut();
    }

    if (source.type === "solid") {
      setBgSolid(source.value);

      if (!isAlreadyActive) {
        html.classList.add(ACTIVE_CLASS);
      }

      requestAnimationFrame(() => fadeIn());
      return;
    }

    setBgImage(source.value);

    if (!isAlreadyActive) {
      html.classList.add(ACTIVE_CLASS);
    }

    const img = new Image();
    img.onload = () => requestAnimationFrame(() => fadeIn());
    img.src = source.value;
  });
}

async function removeBackground() {
  if (!html.classList.contains(ACTIVE_CLASS)) return;

  await fadeOut();
  html.classList.remove(ACTIVE_CLASS);
  clearBgImage();
  html.style.removeProperty("--chatfaces-opacity");
}

function init() {
  const site = detectSite();
  if (!site) return;

  html.setAttribute("data-chatfaces-site", site);
  loadStyleSettings();

  if (site === "chatgpt") {
    startChatGptBubbleObserver();
  }

  chrome.storage.sync.get(BACKGROUND_KEY, (data) => {
    applyBackground(data[BACKGROUND_KEY] || null);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[BACKGROUND_KEY]) {
      applyBackground(changes[BACKGROUND_KEY].newValue || null);
    }

    if (area === "local" && changes[STYLE_SETTINGS_KEY]) {
      applyStyleSettings(changes[STYLE_SETTINGS_KEY].newValue);
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

    applyStyleSettings(message.settings);
    sendResponse({ ok: true });
  });
}

if (document.body) {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}
