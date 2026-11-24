const BACKGROUND_KEY = "chatfaces_bg";
const CUSTOM_BACKGROUND_DATA_KEY = "chatfaces_custom_data";
const SOLID_BACKGROUND_COLOR_KEY = "chatfaces_solid_color";
const STYLE_SETTINGS_KEY = "chatfaces_ui_settings";
const DEFAULT_SOLID_BACKGROUND_COLOR = "#f3efe4";
const MAX_CUSTOM_IMAGE_FILE_BYTES = 25 * 1024 * 1024;
const MAX_CUSTOM_IMAGE_STORAGE_BYTES = 7 * 1024 * 1024;
const MAX_CUSTOM_IMAGE_PIXELS = 80_000_000;
const CUSTOM_IMAGE_VARIANTS = [
  { maxDimension: 2560, quality: 0.86 },
  { maxDimension: 2048, quality: 0.8 },
  { maxDimension: 1600, quality: 0.74 },
];
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
const { MIN_TEXT_CONTRAST, resolveReadability } =
  globalThis.ChatFacesReadability;

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
const changeCustomBtn = document.getElementById("change-custom-btn");
const fileInput = document.getElementById("file-input");
const resetStyleBtn = document.getElementById("reset-style-btn");
const applyStyleBtn = document.getElementById("apply-style-btn");
const chatPreview = document.getElementById("chat-preview");
const previewUserBubble = document.getElementById("preview-user-bubble");
const previewAssistantBubble = document.getElementById("preview-assistant-bubble");
const previewDocument = document.getElementById("preview-document");
const previewDocumentBar = document.getElementById("preview-document-bar");
const previewDocumentCode = document.getElementById("preview-document-code");
const readabilityGuardStatus = document.getElementById(
  "readability-guard-status"
);
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
const actionStatus = document.getElementById("action-status");

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
let applyingDraftChanges = false;
let hasStoredStyleSettings = false;
let activeSiteLabel = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setStatus(message, tone = "neutral") {
  actionStatus.textContent = message;
  actionStatus.dataset.tone = tone;
}

function getSupportedSiteLabel(url) {
  if (typeof url !== "string") return null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "chatgpt.com" || parsed.hostname === "chat.openai.com") {
      return "ChatGPT";
    }
    if (parsed.hostname === "claude.ai") return "Claude";
    if (parsed.hostname === "gemini.google.com") return "Gemini";
    if (parsed.hostname === "grok.com") return "Grok";
    if (parsed.hostname === "x.com" && /^\/i\/grok(?:\/|$)/.test(parsed.pathname)) {
      return "Grok";
    }
  } catch {
    return null;
  }

  return null;
}

function refreshActiveTabStatus() {
  if (!chrome.tabs?.query) {
    setStatus("Settings are saved for supported AI chats.", "neutral");
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const error = chrome.runtime.lastError;
    if (error) {
      setStatus("Settings are saved for supported AI chats.", "neutral");
      return;
    }

    const tab = tabs?.[0];
    activeSiteLabel = null;
    if (!tab?.id || !chrome.tabs.sendMessage) {
      setStatus("Open a supported chat to see changes.", "neutral");
      return;
    }

    // Content-script access does not grant tabs.Tab.url. Ask the script itself,
    // rather than requesting broader browsing permissions just for a status label.
    chrome.tabs.sendMessage(tab.id, { type: "chatfaces:get-status" }, (response) => {
      const messageError = chrome.runtime.lastError;
      if (!messageError && response?.ok && response.siteLabel) {
        activeSiteLabel = response.siteLabel;
        setStatus(`Ready for ${activeSiteLabel}.`, "success");
        return;
      }
      activeSiteLabel = getSupportedSiteLabel(tab.url);
      setStatus(
        activeSiteLabel
          ? `Refresh ${activeSiteLabel} to connect the extension.`
          : "If changes are missing, open or refresh a supported chat. Settings are saved.",
        "warning"
      );
    });
  });
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
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function dataUrlByteLength(dataUrl) {
  const separatorIndex = dataUrl.indexOf(",");
  if (separatorIndex < 0) return Number.POSITIVE_INFINITY;

  const payload = dataUrl.slice(separatorIndex + 1);
  return Math.ceil((payload.length * 3) / 4);
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This image could not be opened."));
    };
    image.src = objectUrl;
  });
}

function renderOptimizedImage(image, maxDimension, quality) {
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("This browser could not prepare the image.");

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", quality);
}

async function optimizeCustomImage(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.size > MAX_CUSTOM_IMAGE_FILE_BYTES) {
    throw new Error("Choose an image smaller than 25 MB.");
  }

  const image = await loadImageFile(file);
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error("This image has invalid dimensions.");
  }
  if (image.naturalWidth * image.naturalHeight > MAX_CUSTOM_IMAGE_PIXELS) {
    throw new Error("Choose an image smaller than 80 megapixels.");
  }

  for (const variant of CUSTOM_IMAGE_VARIANTS) {
    const dataUrl = renderOptimizedImage(
      image,
      variant.maxDimension,
      variant.quality
    );
    if (dataUrlByteLength(dataUrl) <= MAX_CUSTOM_IMAGE_STORAGE_BYTES) {
      return dataUrl;
    }
  }

  throw new Error("This image is still too large after optimization.");
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
    const isActive = card.dataset.bg === normalizedBackground;
    card.classList.toggle("active", isActive);
    card.setAttribute("aria-pressed", String(isActive));
  });
  removeBtn.disabled = !normalizedBackground;

  solidBackgroundInput.value = normalizedColor;
  solidBackgroundValue.textContent = normalizedColor.toUpperCase();
  solidBackgroundInput.classList.toggle("active", normalizedBackground === "solid");

  solidSwatches.forEach((swatch) => {
    const swatchColor = normalizeHexColor(swatch.dataset.color, "");
    const isActive =
      normalizedBackground === "solid" && normalizedColor === swatchColor;
    swatch.classList.toggle("active", isActive);
    swatch.setAttribute("aria-pressed", String(isActive));
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
    changeCustomBtn.hidden = false;
    customCard.setAttribute(
      "aria-label",
      "Use the saved custom background"
    );
  } else {
    customPreview.src = "";
    customPreview.style.display = "none";
    uploadPlaceholder.style.display = "flex";
    changeBtn.style.display = "none";
    changeCustomBtn.hidden = true;
    customCard.setAttribute(
      "aria-label",
      "Upload a custom background image"
    );
  }
}

function updatePaletteState(settings) {
  styleSwatches.forEach((swatch) => {
    const key = swatch.dataset.target;
    const color = normalizeHexColor(swatch.dataset.color, "");
    const isActive = settings[key] === color;
    swatch.classList.toggle("active", isActive);
    swatch.setAttribute("aria-pressed", String(isActive));
  });
}

function updatePresetState(settings) {
  presetButtons.forEach((button) => {
    const isActive =
      settings.accessibilityPreset !== "custom" &&
      button.dataset.preset === settings.accessibilityPreset;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  accessibilityPresetValue.textContent =
    ACCESSIBILITY_PRESET_LABELS[settings.accessibilityPreset] || "Custom";
}

function updatePreview(settings) {
  const readability = resolveReadability(settings);
  const { surfaces } = readability;
  const brightnessOffset = (settings.backgroundBrightness - 100) / 100;
  const previewTopAlpha = clamp(0.16 - brightnessOffset * 0.08, 0.04, 0.24);
  const previewBottomAlpha = clamp(0.9 - brightnessOffset * 0.28, 0.32, 0.94);
  const previewFontSize = clamp(Math.round(settings.messageTextSize * 0.78), 12, 18);
  const previewScale = settings.uiTextScale / 100;

  previewUserBubble.style.backgroundColor = toRgba(
    settings.userBubbleColor,
    surfaces.user.opacity
  );
  previewAssistantBubble.style.backgroundColor = toRgba(
    settings.assistantBubbleColor,
    surfaces.assistant.opacity
  );
  previewDocument.style.backgroundColor = toRgba(
    settings.assistantBubbleColor,
    surfaces.secondary.opacity
  );
  previewDocumentBar.style.backgroundColor = toRgba(
    settings.assistantBubbleColor,
    surfaces.toolbar.opacity
  );
  previewDocumentCode.style.backgroundColor = toRgba(
    settings.assistantBubbleColor,
    surfaces.code.opacity
  );
  previewUserBubble.style.color = surfaces.user.textColor;
  previewAssistantBubble.style.color = surfaces.assistant.textColor;
  previewDocument.style.color = surfaces.secondary.textColor;
  previewDocumentBar.style.color = surfaces.toolbar.textColor;
  previewDocumentCode.style.color = surfaces.code.textColor;
  previewUserBubble.style.fontSize = `${previewFontSize}px`;
  previewAssistantBubble.style.fontSize = `${previewFontSize}px`;
  previewDocument.style.fontSize = `${previewFontSize}px`;
  previewUserBubble.style.lineHeight = "1.55";
  previewAssistantBubble.style.lineHeight = "1.55";
  chatPreview.style.fontSize = `${previewScale}rem`;
  chatPreview.style.background = `
    radial-gradient(circle at top right, rgba(114, 230, 200, ${previewTopAlpha}), transparent 42%),
    linear-gradient(135deg, rgba(9, 18, 35, ${previewBottomAlpha}), rgba(34, 26, 57, ${previewBottomAlpha}))
  `;

  readabilityGuardStatus.dataset.adjusted = String(
    readability.adjustedText || readability.protectedOpacity
  );
  if (readability.adjustedText && readability.protectedOpacity) {
    readabilityGuardStatus.querySelector("span").textContent =
      `Unsafe text and opacity were corrected to keep at least ${MIN_TEXT_CONTRAST}:1 contrast.`;
  } else if (readability.adjustedText) {
    readabilityGuardStatus.querySelector("span").textContent =
      `Unsafe text was corrected only where needed to keep at least ${MIN_TEXT_CONTRAST}:1 contrast.`;
  } else if (readability.protectedOpacity) {
    readabilityGuardStatus.querySelector("span").textContent =
      `Your text color is preserved; surface opacity is protected for at least ${MIN_TEXT_CONTRAST}:1 contrast.`;
  } else {
    readabilityGuardStatus.querySelector("span").textContent =
      `Your selected colors already meet the ${MIN_TEXT_CONTRAST}:1 contrast target.`;
  }
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
  if (applyingDraftChanges) {
    applyStyleBtn.disabled = true;
    applyStyleBtn.textContent = "Applying...";
    return;
  }

  const isDirty =
    !hasStoredStyleSettings ||
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
  if (applyingDraftChanges) return;
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

function commitDraftChanges() {
  if (applyingDraftChanges) return;

  applyingDraftChanges = true;
  applyStyleBtn.disabled = true;
  applyStyleBtn.textContent = "Applying...";

  persistPendingBackground((backgroundSaved) => {
    if (!backgroundSaved) {
      applyingDraftChanges = false;
      syncApplyButton();
      return;
    }

    if (!hasStoredStyleSettings || !styleSettingsEqual(draftStyleSettings, currentStyleSettings)) {
      persistDraftStyleSettings(() => {
        applyingDraftChanges = false;
        syncApplyButton();
      });
      return;
    }

    applyingDraftChanges = false;
    syncApplyButton();
  });
}

function sendStyleSettingsToActiveTab(settings, callback) {
  if (!chrome.tabs?.query) {
    callback?.({ applied: false, reason: "unsupported" });
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const queryError = chrome.runtime.lastError;
    if (queryError) {
      callback?.({ applied: false, reason: "unavailable" });
      return;
    }

    const activeTab = tabs && tabs[0];
    if (!activeTab?.id) {
      callback?.({ applied: false, reason: "unsupported" });
      return;
    }

    const siteLabel = getSupportedSiteLabel(activeTab.url) || activeSiteLabel;

    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "chatfaces:apply-style-settings",
        settings,
      },
      (response) => {
        const messageError = chrome.runtime.lastError;
        if (messageError || !response?.ok) {
          callback?.({
            applied: false,
            reason: siteLabel ? "unavailable" : "unsupported",
            siteLabel,
          });
          return;
        }

        callback?.({
          applied: true,
          siteLabel: response.siteLabel || siteLabel || "the current chat",
        });
      }
    );
  });
}

function persistDraftStyleSettings(callback) {
  const nextSettings = normalizeStyleSettings(draftStyleSettings);

  chrome.storage.local.set({ [STYLE_SETTINGS_KEY]: nextSettings }, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      setStatus("Could not save the style. Try again.", "error");
      callback?.(false);
      return;
    }

    hasStoredStyleSettings = true;
    currentStyleSettings = nextSettings;
    draftStyleSettings = { ...nextSettings };
    renderDraftStyleSettings(draftStyleSettings);
    syncApplyButton();
    sendStyleSettingsToActiveTab(nextSettings, (result) => {
      if (result.applied) {
        setStatus(`Applied to ${result.siteLabel}.`, "success");
      } else if (result.reason === "unavailable") {
        setStatus("Style saved. Refresh the chat page once to apply it.", "warning");
      } else {
        setStatus("Style saved for your next supported chat.", "warning");
      }
    });
    callback?.(true);
  });
}

function persistPendingBackground(callback) {
  if (!backgroundSettingsDirty()) {
    callback?.(true);
    return;
  }

  const nextBackgroundChoice = pendingBackgroundChoice;
  const nextSolidColor = pendingSolidBackgroundColor;

  chrome.storage.local.set({ [SOLID_BACKGROUND_COLOR_KEY]: nextSolidColor }, () => {
    const localError = chrome.runtime.lastError;
    if (localError) {
      setStatus("Could not save the background color. Try again.", "error");
      callback?.(false);
      return;
    }

    chrome.storage.sync.set({ [BACKGROUND_KEY]: nextBackgroundChoice }, () => {
      const syncError = chrome.runtime.lastError;
      if (syncError) {
        setStatus("Could not save the background. Try again.", "error");
        callback?.(false);
        return;
      }

      setCurrentBackground(nextBackgroundChoice, nextSolidColor);
      setStatus("Background and preset applied.", "success");
      callback?.(true);
    });
  });
}

function selectBackground(bgName) {
  clearPendingBackground();
  chrome.storage.sync.set({ [BACKGROUND_KEY]: bgName }, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      setStatus("Could not save the background. Try again.", "error");
      return;
    }

    setCurrentBackground(bgName);
    setStatus("Background updated.", "success");
  });
}

function selectSolidBackground(color) {
  const normalizedColor = normalizeHexColor(color, DEFAULT_SOLID_BACKGROUND_COLOR);
  clearPendingBackground();

  chrome.storage.local.set({ [SOLID_BACKGROUND_COLOR_KEY]: normalizedColor }, () => {
    const localError = chrome.runtime.lastError;
    if (localError) {
      setStatus("Could not save the background color. Try again.", "error");
      return;
    }

    chrome.storage.sync.set({ [BACKGROUND_KEY]: "solid" }, () => {
      const syncError = chrome.runtime.lastError;
      if (syncError) {
        setStatus("Could not save the background. Try again.", "error");
        return;
      }

      setCurrentBackground("solid", normalizedColor);
      setStatus("Solid background updated.", "success");
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
    hasStoredStyleSettings = data[STYLE_SETTINGS_KEY] != null;
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

customCard.addEventListener("click", () => {
  chrome.storage.local.get(CUSTOM_BACKGROUND_DATA_KEY, (data) => {
    const error = chrome.runtime.lastError;
    if (error) {
      setStatus("Could not read the custom background.", "error");
      return;
    }

    if (data[CUSTOM_BACKGROUND_DATA_KEY]) {
      selectBackground("custom");
    } else {
      fileInput.click();
    }
  });
});

changeCustomBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  customCard.disabled = true;
  changeCustomBtn.disabled = true;
  setStatus("Optimizing your image for fast loading...", "neutral");

  try {
    const dataUrl = await optimizeCustomImage(file);
    chrome.storage.local.set({ [CUSTOM_BACKGROUND_DATA_KEY]: dataUrl }, () => {
      const error = chrome.runtime.lastError;
      customCard.disabled = false;
      changeCustomBtn.disabled = false;
      fileInput.value = "";

      if (error) {
        setStatus("The image could not be saved. Try a smaller file.", "error");
        return;
      }

      showCustomPreview(dataUrl);
      selectBackground("custom");
    });
  } catch (error) {
    customCard.disabled = false;
    changeCustomBtn.disabled = false;
    fileInput.value = "";
    setStatus(error.message || "The image could not be prepared.", "error");
  }
});

removeBtn.addEventListener("click", () => {
  clearPendingBackground();
  chrome.storage.sync.remove(BACKGROUND_KEY, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      setStatus("Could not remove the background. Try again.", "error");
      return;
    }

    setCurrentBackground(null, currentSolidBackgroundColor);
    setStatus("Background removed. Your style settings are preserved.", "success");
  });
});

solidBackgroundInput.addEventListener("input", () => {
  const color = normalizeHexColor(
    solidBackgroundInput.value,
    DEFAULT_SOLID_BACKGROUND_COLOR
  );
  solidBackgroundValue.textContent = color.toUpperCase();
});

solidBackgroundInput.addEventListener("change", () => {
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
    if (applyingDraftChanges) return;
    applyAccessibilityPreset(button.dataset.preset);
    commitDraftChanges();
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
  setStatus("Default style is ready. Click Apply Style to confirm.", "neutral");
});

applyStyleBtn.addEventListener("click", () => {
  commitDraftChanges();
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
    hasStoredStyleSettings = changes[STYLE_SETTINGS_KEY].newValue != null;
    setStoredStyleSettings(changes[STYLE_SETTINGS_KEY].newValue);
  }
});

loadBackgroundChoice();
loadCustomPreview();
loadStyleSettings();
refreshActiveTabStatus();
