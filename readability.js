(() => {
  "use strict";

  const MIN_TEXT_CONTRAST = 4.5;
  const CONTRAST_SAFETY_TARGET = 4.55;
  const DARK_TEXT = "#000000";
  const LIGHT_TEXT = "#ffffff";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeHexColor(value, fallback = DARK_TEXT) {
    if (typeof value !== "string") return fallback;

    const trimmed = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();

    return fallback;
  }

  function hexToRgb(hex) {
    const value = normalizeHexColor(hex).slice(1);
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  function linearizeChannel(channel) {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  }

  function relativeLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    return (
      0.2126 * linearizeChannel(r) +
      0.7152 * linearizeChannel(g) +
      0.0722 * linearizeChannel(b)
    );
  }

  function contrastRatio(firstColor, secondColor) {
    const first = relativeLuminance(firstColor);
    const second = relativeLuminance(secondColor);
    const lighter = Math.max(first, second);
    const darker = Math.min(first, second);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function compositeColor(foreground, opacity, backdrop) {
    const front = hexToRgb(foreground);
    const back = hexToRgb(backdrop);
    const alpha = clamp(finiteNumber(opacity, 1), 0, 1);
    const channel = (frontValue, backValue) =>
      Math.round(frontValue * alpha + backValue * (1 - alpha));
    const toHex = (value) => value.toString(16).padStart(2, "0");

    return `#${toHex(channel(front.r, back.r))}${toHex(
      channel(front.g, back.g)
    )}${toHex(channel(front.b, back.b))}`;
  }

  function getSurfaceLuminanceRange(backgroundColor, opacity) {
    return {
      min: relativeLuminance(
        compositeColor(backgroundColor, opacity, DARK_TEXT)
      ),
      max: relativeLuminance(
        compositeColor(backgroundColor, opacity, LIGHT_TEXT)
      ),
    };
  }

  function minimumSurfaceContrast(textColor, backgroundColor, opacity) {
    const textLuminance = relativeLuminance(textColor);
    const range = getSurfaceLuminanceRange(backgroundColor, opacity);

    if (textLuminance >= range.min && textLuminance <= range.max) return 1;
    if (textLuminance < range.min) {
      return (range.min + 0.05) / (textLuminance + 0.05);
    }

    return (textLuminance + 0.05) / (range.max + 0.05);
  }

  function findSafeOpacity(
    textColor,
    backgroundColor,
    requestedOpacity,
    minimumContrast = CONTRAST_SAFETY_TARGET
  ) {
    const requested = clamp(finiteNumber(requestedOpacity, 1), 0, 1);
    if (
      minimumSurfaceContrast(textColor, backgroundColor, requested) >=
      minimumContrast
    ) {
      return requested;
    }

    if (
      minimumSurfaceContrast(textColor, backgroundColor, 1) < minimumContrast
    ) {
      return null;
    }

    let unsafe = requested;
    let safe = 1;
    for (let index = 0; index < 18; index += 1) {
      const candidate = (unsafe + safe) / 2;
      if (
        minimumSurfaceContrast(textColor, backgroundColor, candidate) >=
        minimumContrast
      ) {
        safe = candidate;
      } else {
        unsafe = candidate;
      }
    }

    const roundedSafe = Math.min(1, Math.ceil(safe * 1000) / 1000);
    return roundedSafe;
  }

  function resolveReadableSurface(
    preferredTextColor,
    backgroundColor,
    requestedOpacity,
    minimumContrast = CONTRAST_SAFETY_TARGET
  ) {
    const preferred = normalizeHexColor(preferredTextColor, LIGHT_TEXT);
    const background = normalizeHexColor(backgroundColor, DARK_TEXT);
    const requested = clamp(finiteNumber(requestedOpacity, 1), 0, 1);
    const preferredOpacity = findSafeOpacity(
      preferred,
      background,
      requested,
      minimumContrast
    );

    if (preferredOpacity !== null) {
      return {
        textColor: preferred,
        opacity: preferredOpacity,
        contrast: minimumSurfaceContrast(
          preferred,
          background,
          preferredOpacity
        ),
        adjustedText: false,
        adjustedOpacity: preferredOpacity > requested + 0.0005,
      };
    }

    const fallbackCandidates = [DARK_TEXT, LIGHT_TEXT]
      .map((textColor) => ({
        textColor,
        opacity: findSafeOpacity(
          textColor,
          background,
          requested,
          minimumContrast
        ),
      }))
      .filter((candidate) => candidate.opacity !== null)
      .sort((first, second) => {
        if (first.opacity !== second.opacity) {
          return first.opacity - second.opacity;
        }
        return (
          contrastRatio(second.textColor, background) -
          contrastRatio(first.textColor, background)
        );
      });

    const fallback = fallbackCandidates[0];
    return {
      textColor: fallback.textColor,
      opacity: fallback.opacity,
      contrast: minimumSurfaceContrast(
        fallback.textColor,
        background,
        fallback.opacity
      ),
      adjustedText: fallback.textColor !== preferred,
      adjustedOpacity: fallback.opacity > requested + 0.0005,
    };
  }

  function resolveReadability(settings = {}) {
    if (!settings || typeof settings !== "object") settings = {};
    const preferredTextColor = normalizeHexColor(settings.textColor, LIGHT_TEXT);
    const userBubbleColor = normalizeHexColor(settings.userBubbleColor, "#073b32");
    const assistantBubbleColor = normalizeHexColor(
      settings.assistantBubbleColor,
      "#1e1e32"
    );
    const baseOpacity = clamp(
      finiteNumber(settings.surfaceOpacity, 75) / 100,
      0.25,
      0.95
    );
    const requestedOpacities = {
      user: Math.max(baseOpacity, 0.68),
      assistant: Math.max(Math.min(baseOpacity + 0.05, 0.95), 0.78),
      input: Math.max(Math.min(baseOpacity + 0.08, 0.95), 0.8),
      sidebar: Math.max(Math.min(baseOpacity + 0.05, 0.95), 0.8),
      secondary: Math.max(Math.min(baseOpacity + 0.18, 0.98), 0.86),
      toolbar: Math.max(Math.min(baseOpacity + 0.28, 0.99), 0.9),
      code: Math.max(Math.min(baseOpacity + 0.24, 0.99), 0.88),
    };
    const surfaces = {
      user: resolveReadableSurface(
        preferredTextColor,
        userBubbleColor,
        requestedOpacities.user
      ),
      assistant: resolveReadableSurface(
        preferredTextColor,
        assistantBubbleColor,
        requestedOpacities.assistant
      ),
      input: resolveReadableSurface(
        preferredTextColor,
        assistantBubbleColor,
        requestedOpacities.input
      ),
      sidebar: resolveReadableSurface(
        preferredTextColor,
        assistantBubbleColor,
        requestedOpacities.sidebar
      ),
      secondary: resolveReadableSurface(
        preferredTextColor,
        assistantBubbleColor,
        requestedOpacities.secondary
      ),
      toolbar: resolveReadableSurface(
        preferredTextColor,
        assistantBubbleColor,
        requestedOpacities.toolbar
      ),
      code: resolveReadableSurface(
        preferredTextColor,
        assistantBubbleColor,
        requestedOpacities.code
      ),
    };
    const surfaceList = Object.values(surfaces);

    return {
      surfaces,
      adjustedText: surfaceList.some((surface) => surface.adjustedText),
      protectedOpacity:
        surfaces.user.opacity > baseOpacity + 0.0005 ||
        surfaces.assistant.opacity > Math.min(baseOpacity + 0.05, 0.95) + 0.0005 ||
        surfaces.input.opacity > Math.min(baseOpacity + 0.08, 0.95) + 0.0005 ||
        surfaces.secondary.opacity > Math.min(baseOpacity + 0.18, 0.98) + 0.0005,
    };
  }

  globalThis.ChatFacesReadability = Object.freeze({
    MIN_TEXT_CONTRAST,
    contrastRatio,
    minimumSurfaceContrast,
    resolveReadableSurface,
    resolveReadability,
  });
})();
