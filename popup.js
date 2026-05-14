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

const ACCESSIBILITY_PRESET_LABELS = {
  default: "Balanced",
  lowVision: "Low Vision",
  largeType: "Large Type",
  highContrast: "High Contrast",
  warmContrast: "Warm Contrast",
  paper: "Paper",
  custom: "Custom",
};

const ACCESSIBILITY_PRESET_BACKGROUNDS = {
  lowVision: "#050816",
  paper: DEFAULT_SOLID_BACKGROUND_COLOR,
};

const ACCESSIBILITY_PRESETS = {
  default: { ...DEFAULT_STYLE_SETTINGS, accessibilityPreset: "default" },
  lowVision: {
    ...DEFAULT_STYLE_SETTINGS,
    accessibilityPreset: "lowVision",
    userBubbleColor: "#0f4bb8",
    assistantBubbleColor: "#111827",
    textColor: "#ffffff",
    surfaceOpacity: 94,
    backgroundBrightness: 100,
    messageTextSize: 24,
    uiTextScale: 130,
  },
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
const solidBackgroundInput = document.getElementById("solid-background-color");
const solidBackgroundValue = document.getElementById("solid-background-color-value");
const surfaceOpacityInput = document.getElementById("surface-opacity");
const surfaceOpacityValue = document.getElementById("surface-opacity-value");
const backgroundBrightnessInput = document.getElementById("background-brightness");
const backgroundBrightnessValue = document.getElementById("background-brightness-value");
const styleSwatches = document.querySelectorAll(".swatch[data-target]");
const solidSwatches = document.querySelectorAll(".solid-swatch");

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
let currentBackgroundChoice = null;
let currentSolidBackgroundColor = DEFAULT_SOLID_BACKGROUND_COLOR;
let pendingBackgroundChoice = null;
let pendingSolidBackgroundColor = DEFAULT_SOLID_BACKGROUND_COLOR;

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

function backgroundSettingsEqual(leftChoice, leftColor, rightChoice, rightColor) {
  return (
    normalizeBackgroundChoice(leftChoice) === normalizeBackgroundChoice(rightChoice) &&
    normalizeHexColor(leftColor, DEFAULT_SOLID_BACKGROUND_COLOR) ===
      normalizeHexColor(rightColor, DEFAULT_SOLID_BACKGROUND_COLOR)
  );
}

function backgroundSettingsDirty() {
  if (pendingBackgroundChoice === null) return false;

  return !backgroundSettingsEqual(
    pendingBackgroundChoice,
    pendingSolidBackgroundColor,
    currentBackgroundChoice,
    currentSolidBackgroundColor
  );
}

function renderBackgroundState(
  bgName = currentBackgroundChoice,
  solidColor = currentSolidBackgroundColor
) {
  const normalizedBackground = normalizeBackgroundChoice(bgName);
  const normalizedColor = normalizeHexColor(
    solidColor,
    DEFAULT_SOLID_BACKGROUND_COLOR
  );

  cards.forEach((card) => {
    card.classList.toggle("active", card.dataset.bg === normalizedBackground);
  });
  removeBtn.disabled = !normalizedBackground;

  solidBackgroundInput.value = normalizedColor;
  solidBackgroundValue.textContent = normalizedColor.toUpperCase();
  solidBackgroundInput.classList.toggle("active", normalizedBackground === "solid");

  solidSwatches.forEach((swatch) => {
    const swatchColor = normalizeHexColor(swatch.dataset.color, "");
    swatch.classList.toggle(
      "active",
      normalizedBackground === "solid" && normalizedColor === swatchColor
    );
  });
}

function setCurrentBackground(bgName, solidColor = currentSolidBackgroundColor) {
  currentBackgroundChoice = normalizeBackgroundChoice(bgName);
  currentSolidBackgroundColor = normalizeHexColor(
    solidColor,
    DEFAULT_SOLID_BACKGROUND_COLOR
  );

  if (
    backgroundSettingsEqual(
      pendingBackgroundChoice,
      pendingSolidBackgroundColor,
      currentBackgroundChoice,
      currentSolidBackgroundColor
    )
  ) {
    pendingBackgroundChoice = null;
    pendingSolidBackgroundColor = currentSolidBackgroundColor;
  }

  renderBackgroundState(
    pendingBackgroundChoice ?? currentBackgroundChoice,
    pendingBackgroundChoice === null
      ? currentSolidBackgroundColor
      : pendingSolidBackgroundColor
  );
  syncApplyButton();
}

function setPendingBackground(bgName, solidColor = currentSolidBackgroundColor) {
  pendingBackgroundChoice = normalizeBackgroundChoice(bgName);
  pendingSolidBackgroundColor = normalizeHexColor(
    solidColor,
    DEFAULT_SOLID_BACKGROUND_COLOR
  );

  renderBackgroundState(pendingBackgroundChoice, pendingSolidBackgroundColor);
  syncApplyButton();
}

function clearPendingBackground() {
  pendingBackgroundChoice = null;
  pendingSolidBackgroundColor = currentSolidBackgroundColor;
  renderBackgroundState(currentBackgroundChoice, currentSolidBackgroundColor);
  syncApplyButton();
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
  styleSwatches.forEach((swatch) => {
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
  const isDirty =
    !styleSettingsEqual(draftStyleSettings, currentStyleSettings) ||
    backgroundSettingsDirty();
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

  const recommendedBackground = ACCESSIBILITY_PRESET_BACKGROUNDS[presetKey];
  if (recommendedBackground) {
    setPendingBackground("solid", recommendedBackground);
  } else {
    clearPendingBackground();
  }
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

function persistDraftStyleSettings(callback) {
  const nextSettings = normalizeStyleSettings(draftStyleSettings);

  chrome.storage.local.set({ [STYLE_SETTINGS_KEY]: nextSettings }, () => {
    currentStyleSettings = nextSettings;
    draftStyleSettings = { ...nextSettings };
    renderDraftStyleSettings(draftStyleSettings);
    syncApplyButton();
    sendStyleSettingsToActiveTab(nextSettings);
    callback?.();
  });
}

function persistPendingBackground(callback) {
  if (!backgroundSettingsDirty()) {
    callback?.();
    return;
  }

  const nextBackgroundChoice = pendingBackgroundChoice;
  const nextSolidColor = pendingSolidBackgroundColor;

  chrome.storage.local.set({ [SOLID_BACKGROUND_COLOR_KEY]: nextSolidColor }, () => {
    chrome.storage.sync.set({ [BACKGROUND_KEY]: nextBackgroundChoice }, () => {
      setCurrentBackground(nextBackgroundChoice, nextSolidColor);
      callback?.();
    });
  });
}

function selectBackground(bgName) {
  clearPendingBackground();
  chrome.storage.sync.set({ [BACKGROUND_KEY]: bgName }, () => {
    setCurrentBackground(bgName);
  });
}

function selectSolidBackground(color) {
  const normalizedColor = normalizeHexColor(color, DEFAULT_SOLID_BACKGROUND_COLOR);
  clearPendingBackground();

  chrome.storage.local.set({ [SOLID_BACKGROUND_COLOR_KEY]: normalizedColor }, () => {
    chrome.storage.sync.set({ [BACKGROUND_KEY]: "solid" }, () => {
      setCurrentBackground("solid", normalizedColor);
    });
  });
}

function loadBackgroundChoice() {
  chrome.storage.local.get(SOLID_BACKGROUND_COLOR_KEY, (localData) => {
    const solidColor = normalizeHexColor(
      localData[SOLID_BACKGROUND_COLOR_KEY],
      DEFAULT_SOLID_BACKGROUND_COLOR
    );

    chrome.storage.sync.get(BACKGROUND_KEY, (syncData) => {
      setCurrentBackground(syncData[BACKGROUND_KEY] || null, solidColor);
    });
  });
}

function loadCustomPreview() {
  chrome.storage.local.get(CUSTOM_BACKGROUND_DATA_KEY, (data) => {
    showCustomPreview(data[CUSTOM_BACKGROUND_DATA_KEY] || null);
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
    selectBackground(bg);
  });
});

customCard.addEventListener("click", (event) => {
  if (event.target.id === "change-btn") {
    fileInput.click();
    return;
  }

  chrome.storage.local.get(CUSTOM_BACKGROUND_DATA_KEY, (data) => {
    if (data[CUSTOM_BACKGROUND_DATA_KEY]) {
      selectBackground("custom");
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

    chrome.storage.local.set({ [CUSTOM_BACKGROUND_DATA_KEY]: dataUrl }, () => {
      showCustomPreview(dataUrl);
      selectBackground("custom");
    });
  };

  reader.readAsDataURL(file);
  fileInput.value = "";
});

removeBtn.addEventListener("click", () => {
  clearPendingBackground();
  chrome.storage.sync.remove(BACKGROUND_KEY, () => {
    setCurrentBackground(null, currentSolidBackgroundColor);
  });
});

solidBackgroundInput.addEventListener("input", () => {
  selectSolidBackground(solidBackgroundInput.value);
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

styleSwatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    updateDraftStyleSettings({
      [swatch.dataset.target]: swatch.dataset.color,
    });
  });
});

solidSwatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    selectSolidBackground(swatch.dataset.color);
  });
});

resetStyleBtn.addEventListener("click", () => {
  clearPendingBackground();
  updateDraftStyleSettings(DEFAULT_STYLE_SETTINGS, { preservePreset: true });
});

applyStyleBtn.addEventListener("click", () => {
  persistPendingBackground(() => {
    if (!styleSettingsEqual(draftStyleSettings, currentStyleSettings)) {
      persistDraftStyleSettings();
      return;
    }

    syncApplyButton();
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes[BACKGROUND_KEY]) {
    setCurrentBackground(changes[BACKGROUND_KEY].newValue || null);
  }

  if (area === "local" && changes[CUSTOM_BACKGROUND_DATA_KEY]) {
    showCustomPreview(changes[CUSTOM_BACKGROUND_DATA_KEY].newValue || null);
  }

  if (area === "local" && changes[SOLID_BACKGROUND_COLOR_KEY]) {
    setCurrentBackground(
      currentBackgroundChoice,
      changes[SOLID_BACKGROUND_COLOR_KEY].newValue || DEFAULT_SOLID_BACKGROUND_COLOR
    );
  }

  if (area === "local" && changes[STYLE_SETTINGS_KEY]) {
    setStoredStyleSettings(changes[STYLE_SETTINGS_KEY].newValue);
  }
});

loadBackgroundChoice();
loadCustomPreview();
loadStyleSettings();
