const STYLE_SETTINGS_KEY = "chatfaces_ui_settings";
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

const ACCESSIBILITY_PRESET_LABELS = {
  default: "Balanced",
  largeType: "Large Type",
  highContrast: "High Contrast",
  warmContrast: "Warm Contrast",
  paper: "Paper",
  custom: "Custom",
};

const ACCESSIBILITY_PRESETS = {
  default: { ...DEFAULT_STYLE_SETTINGS, accessibilityPreset: "default" },
  largeType: {
    ...DEFAULT_STYLE_SETTINGS,
    accessibilityPreset: "largeType",
    textColor: "#ffffff",
    surfaceOpacity: 72,
    backgroundBrightness: 85,
    messageTextSize: 22,
    uiTextScale: 120,
  },
  highContrast: {
    ...DEFAULT_STYLE_SETTINGS,
    accessibilityPreset: "highContrast",
    userBubbleColor: "#005a4f",
    assistantBubbleColor: "#0f172a",
    textColor: "#ffffff",
    surfaceOpacity: 88,
    backgroundBrightness: 72,
    messageTextSize: 20,
    uiTextScale: 115,
  },
  warmContrast: {
    ...DEFAULT_STYLE_SETTINGS,
    accessibilityPreset: "warmContrast",
    userBubbleColor: "#7a3e00",
    assistantBubbleColor: "#23222a",
    textColor: "#fff7eb",
    surfaceOpacity: 84,
    backgroundBrightness: 78,
    messageTextSize: 20,
    uiTextScale: 110,
  },
  paper: {
    ...DEFAULT_STYLE_SETTINGS,
    accessibilityPreset: "paper",
    userBubbleColor: "#f8f6f1",
    assistantBubbleColor: "#f8f6f1",
    textColor: "#111111",
    surfaceOpacity: 94,
    backgroundBrightness: 112,
    messageTextSize: 19,
    uiTextScale: 105,
  },
};

const cards = document.querySelectorAll(".card");
const removeBtn = document.getElementById("remove-btn");
const customCard = document.getElementById("custom-card");
const customPreview = document.getElementById("custom-preview");
const uploadPlaceholder = document.getElementById("upload-placeholder");
const changeBtn = document.getElementById("change-btn");
const fileInput = document.getElementById("file-input");
const resetStyleBtn = document.getElementById("reset-style-btn");
const applyStyleBtn = document.getElementById("apply-style-btn");
const chatPreview = document.getElementById("chat-preview");
const previewUserBubble = document.getElementById("preview-user-bubble");
const previewAssistantBubble = document.getElementById("preview-assistant-bubble");
const accessibilityPresetValue = document.getElementById(
  "accessibility-preset-value"
);
const presetButtons = document.querySelectorAll(".preset-chip");
const messageTextSizeInput = document.getElementById("message-text-size");
const messageTextSizeValue = document.getElementById("message-text-size-value");
const uiTextScaleInput = document.getElementById("ui-text-scale");
const uiTextScaleValue = document.getElementById("ui-text-scale-value");
const surfaceOpacityInput = document.getElementById("surface-opacity");
const surfaceOpacityValue = document.getElementById("surface-opacity-value");
const backgroundBrightnessInput = document.getElementById("background-brightness");
const backgroundBrightnessValue = document.getElementById("background-brightness-value");
const swatches = document.querySelectorAll(".swatch");

const styleInputs = {
  userBubbleColor: document.getElementById("user-bubble-color"),
  assistantBubbleColor: document.getElementById("assistant-bubble-color"),
  textColor: document.getElementById("text-color"),
};

const styleValueLabels = {
  userBubbleColor: document.getElementById("user-bubble-color-value"),
  assistantBubbleColor: document.getElementById("assistant-bubble-color-value"),
  textColor: document.getElementById("text-color-value"),
};

let currentStyleSettings = { ...DEFAULT_STYLE_SETTINGS };
let draftStyleSettings = { ...DEFAULT_STYLE_SETTINGS };

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
  if (typeof value !== "string") return DEFAULT_STYLE_SETTINGS.accessibilityPreset;
  if (Object.hasOwn(ACCESSIBILITY_PRESET_LABELS, value)) return value;
  return DEFAULT_STYLE_SETTINGS.accessibilityPreset;
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
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function styleSettingsEqual(left, right) {
  return (
    left.accessibilityPreset === right.accessibilityPreset &&
    left.userBubbleColor === right.userBubbleColor &&
    left.assistantBubbleColor === right.assistantBubbleColor &&
    left.textColor === right.textColor &&
    left.surfaceOpacity === right.surfaceOpacity &&
    left.backgroundBrightness === right.backgroundBrightness &&
    left.messageTextSize === right.messageTextSize &&
    left.uiTextScale === right.uiTextScale
  );
}

function setActive(bgName) {
  cards.forEach((card) => {
    card.classList.toggle("active", card.dataset.bg === bgName);
  });
  removeBtn.disabled = !bgName;
}

function showCustomPreview(dataUrl) {
  if (dataUrl) {
    customPreview.src = dataUrl;
    customPreview.style.display = "block";
    uploadPlaceholder.style.display = "none";
    changeBtn.style.display = "block";
  } else {
    customPreview.src = "";
    customPreview.style.display = "none";
    uploadPlaceholder.style.display = "flex";
    changeBtn.style.display = "none";
  }
}

function updatePaletteState(settings) {
  swatches.forEach((swatch) => {
    const key = swatch.dataset.target;
    const color = normalizeHexColor(swatch.dataset.color, "");
    swatch.classList.toggle("active", settings[key] === color);
  });
}

function updatePresetState(settings) {
  presetButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      settings.accessibilityPreset !== "custom" &&
        button.dataset.preset === settings.accessibilityPreset
    );
  });

  accessibilityPresetValue.textContent =
    ACCESSIBILITY_PRESET_LABELS[settings.accessibilityPreset] || "Custom";
}

function updatePreview(settings) {
  const bubbleOpacity = settings.surfaceOpacity / 100;
  const brightnessOffset = (settings.backgroundBrightness - 100) / 100;
  const previewTopAlpha = clamp(0.16 - brightnessOffset * 0.08, 0.04, 0.24);
  const previewBottomAlpha = clamp(0.9 - brightnessOffset * 0.28, 0.32, 0.94);
  const previewFontSize = clamp(Math.round(settings.messageTextSize * 0.78), 12, 18);
  const previewScale = settings.uiTextScale / 100;

  previewUserBubble.style.backgroundColor = toRgba(
    settings.userBubbleColor,
    bubbleOpacity
  );
  previewAssistantBubble.style.backgroundColor = toRgba(
    settings.assistantBubbleColor,
    Math.min(bubbleOpacity + 0.05, 0.95)
  );
  previewUserBubble.style.color = settings.textColor;
  previewAssistantBubble.style.color = settings.textColor;
  previewUserBubble.style.fontSize = `${previewFontSize}px`;
  previewAssistantBubble.style.fontSize = `${previewFontSize}px`;
  previewUserBubble.style.lineHeight = "1.55";
  previewAssistantBubble.style.lineHeight = "1.55";
  chatPreview.style.fontSize = `${previewScale}rem`;
  chatPreview.style.background = `
    radial-gradient(circle at top right, rgba(114, 230, 200, ${previewTopAlpha}), transparent 42%),
    linear-gradient(135deg, rgba(9, 18, 35, ${previewBottomAlpha}), rgba(34, 26, 57, ${previewBottomAlpha}))
  `;
}

function renderDraftStyleSettings(settings) {
  styleInputs.userBubbleColor.value = settings.userBubbleColor;
  styleInputs.assistantBubbleColor.value = settings.assistantBubbleColor;
  styleInputs.textColor.value = settings.textColor;
  messageTextSizeInput.value = String(settings.messageTextSize);
  uiTextScaleInput.value = String(settings.uiTextScale);
  surfaceOpacityInput.value = String(settings.surfaceOpacity);
  backgroundBrightnessInput.value = String(settings.backgroundBrightness);

  messageTextSizeValue.textContent = `${settings.messageTextSize}px`;
  uiTextScaleValue.textContent = `${settings.uiTextScale}%`;
  styleValueLabels.userBubbleColor.textContent = settings.userBubbleColor.toUpperCase();
  styleValueLabels.assistantBubbleColor.textContent =
    settings.assistantBubbleColor.toUpperCase();
  styleValueLabels.textColor.textContent = settings.textColor.toUpperCase();
  surfaceOpacityValue.textContent = `${settings.surfaceOpacity}%`;
  backgroundBrightnessValue.textContent = `${settings.backgroundBrightness}%`;

  updatePresetState(settings);
  updatePaletteState(settings);
  updatePreview(settings);
}

function syncApplyButton() {
  const isDirty = !styleSettingsEqual(draftStyleSettings, currentStyleSettings);
  applyStyleBtn.disabled = !isDirty;
  applyStyleBtn.textContent = isDirty ? "Apply Style" : "Applied";
}

function setStoredStyleSettings(settings) {
  currentStyleSettings = normalizeStyleSettings(settings);
  draftStyleSettings = { ...currentStyleSettings };
  renderDraftStyleSettings(draftStyleSettings);
  syncApplyButton();
}

function updateDraftStyleSettings(partialSettings, options = {}) {
  const nextSettings = normalizeStyleSettings({
    ...draftStyleSettings,
    ...partialSettings,
  });

  if (
    !options.preservePreset &&
    Object.keys(partialSettings).some((key) => key !== "accessibilityPreset")
  ) {
    nextSettings.accessibilityPreset = "custom";
  }

  draftStyleSettings = nextSettings;

  renderDraftStyleSettings(draftStyleSettings);
  syncApplyButton();
}

function applyAccessibilityPreset(presetKey) {
  const preset = ACCESSIBILITY_PRESETS[presetKey];
  if (!preset) return;

  updateDraftStyleSettings(preset, { preservePreset: true });
}

function sendStyleSettingsToActiveTab(settings) {
  if (!chrome.tabs?.query) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs && tabs[0];
    if (!activeTab?.id) return;

    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "chatfaces:apply-style-settings",
        settings,
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  });
}

function persistDraftStyleSettings() {
  const nextSettings = normalizeStyleSettings(draftStyleSettings);

  chrome.storage.local.set({ [STYLE_SETTINGS_KEY]: nextSettings }, () => {
    currentStyleSettings = nextSettings;
    draftStyleSettings = { ...nextSettings };
    renderDraftStyleSettings(draftStyleSettings);
    syncApplyButton();
    sendStyleSettingsToActiveTab(nextSettings);
  });
}

function loadBackgroundChoice() {
  chrome.storage.sync.get("chatfaces_bg", (data) => {
    setActive(data.chatfaces_bg || null);
  });
}

function loadCustomPreview() {
  chrome.storage.local.get("chatfaces_custom_data", (data) => {
    showCustomPreview(data.chatfaces_custom_data || null);
  });
}

function loadStyleSettings() {
  chrome.storage.local.get(STYLE_SETTINGS_KEY, (data) => {
    setStoredStyleSettings(data[STYLE_SETTINGS_KEY]);
  });
}

cards.forEach((card) => {
  if (card.id === "custom-card") return;

  card.addEventListener("click", () => {
    const bg = card.dataset.bg;
    chrome.storage.sync.set({ chatfaces_bg: bg }, () => {
      setActive(bg);
    });
  });
});

customCard.addEventListener("click", (event) => {
  if (event.target.id === "change-btn") {
    fileInput.click();
    return;
  }

  chrome.storage.local.get("chatfaces_custom_data", (data) => {
    if (data.chatfaces_custom_data) {
      chrome.storage.sync.set({ chatfaces_bg: "custom" }, () => {
        setActive("custom");
      });
    } else {
      fileInput.click();
    }
  });
});

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const dataUrl = loadEvent.target.result;

    chrome.storage.local.set({ chatfaces_custom_data: dataUrl }, () => {
      showCustomPreview(dataUrl);
      chrome.storage.sync.set({ chatfaces_bg: "custom" }, () => {
        setActive("custom");
      });
    });
  };

  reader.readAsDataURL(file);
  fileInput.value = "";
});

removeBtn.addEventListener("click", () => {
  chrome.storage.sync.remove("chatfaces_bg", () => {
    setActive(null);
  });
});

surfaceOpacityInput.addEventListener("input", () => {
  updateDraftStyleSettings({ surfaceOpacity: Number(surfaceOpacityInput.value) });
});

backgroundBrightnessInput.addEventListener("input", () => {
  updateDraftStyleSettings({
    backgroundBrightness: Number(backgroundBrightnessInput.value),
  });
});

messageTextSizeInput.addEventListener("input", () => {
  updateDraftStyleSettings({
    messageTextSize: Number(messageTextSizeInput.value),
  });
});

uiTextScaleInput.addEventListener("input", () => {
  updateDraftStyleSettings({
    uiTextScale: Number(uiTextScaleInput.value),
  });
});

Object.entries(styleInputs).forEach(([key, input]) => {
  input.addEventListener("input", () => {
    updateDraftStyleSettings({ [key]: input.value });
  });
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyAccessibilityPreset(button.dataset.preset);
  });
});

swatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    updateDraftStyleSettings({
      [swatch.dataset.target]: swatch.dataset.color,
    });
  });
});

resetStyleBtn.addEventListener("click", () => {
  updateDraftStyleSettings(DEFAULT_STYLE_SETTINGS, { preservePreset: true });
});

applyStyleBtn.addEventListener("click", () => {
  persistDraftStyleSettings();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.chatfaces_bg) {
    setActive(changes.chatfaces_bg.newValue || null);
  }

  if (area === "local" && changes.chatfaces_custom_data) {
    showCustomPreview(changes.chatfaces_custom_data.newValue || null);
  }

  if (area === "local" && changes[STYLE_SETTINGS_KEY]) {
    setStoredStyleSettings(changes[STYLE_SETTINGS_KEY].newValue);
  }
});

loadBackgroundChoice();
loadCustomPreview();
loadStyleSettings();
