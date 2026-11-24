# Feature Release Roadmap

This roadmap covers the post-`v1.0.0` feature plan. Current extension version: `v1.3.11`.

## November 2026 Background Hotfix

`v1.3.11` handles the backdrop that moved to ChatGPT's parent workspace and the new animated home greeting. Keep both observed layouts in regression coverage rather than replacing the previous fixture. Preserve native decorations and restore the site's backdrop when a background is removed. See [verification and release notes](docs/releases/1.3.11.md).

## October 2026 Background Hotfix

`v1.3.10` targets ChatGPT's new opaque workspace pseudo-element, adds home-screen readability surfaces, and fixes popup detection when Chrome omits the tab URL. Background regression coverage must include real image decoding, uploaded images, empty conversations, and the exact previous package as a failing baseline. Installed-build checks remain a separate release gate. See [verification and release notes](docs/releases/1.3.10.md).

## September 2026 Compatibility Update

`v1.3.9` restores current ChatGPT and Grok message detection, scopes transparency to recognized chat containers, preserves code formatting, and adds browser regression coverage for every supported provider. Accessibility and visibility regressions take priority over new visual features. See [verification and release notes](docs/releases/1.3.9.md).

## North Star

Ship a stable, customizable chat visual identity experience across supported AI sites, then prepare for broader distribution (Chrome Web Store growth + cross-browser support).

## Release Timeline (2026)

| Release | Target Window | Goal |
|---|---|---|
| `v1.1.0` | Mar 4 - Mar 17 | Stability and compatibility hardening |
| `v1.2.0` | Mar 18 - Apr 7 | User controls (palette + opacity) and quality-of-life features |
| `v1.3.0` | Apr 8 - Apr 28 | Preconfigured themes and content expansion |
| `v1.3.7` | Jul 16 | Themed Canvas, Artifact, markdown, dialog, and file-preview windows |
| `v1.3.8` | Jul 16 | Always-on contrast protection for chat text and generated outcomes |
| `v1.3.9` | Sep 29 | Current chat layouts, readable surfaces, and rendering regression tests |
| `v1.3.10` | Oct 1 | ChatGPT workspace background hotfix and image-background regression coverage |
| `v1.3.11` | Nov 24 | ChatGPT parent-workspace backdrop and updated home greeting |
| `v1.4.0` | Jul 13 - Aug 14 | Avatars and chat identity |
| `v2.0.0` | Aug 17 - Sep 18 | Production readiness and platform expansion |

Sequencing rule: preconfigured themes ship only after user-facing color and opacity controls are stable in `v1.2.0`.
Sequencing rule: avatar features ship only after `v1.2.0` controls and `v1.3.0` themes are stable, so avatar styling can inherit the final bubble/layout system.

## `v1.1.0` - Stability First

### Scope

- Refactor "nuclear transparency" CSS into safer site-specific rules to reduce breakage after UI updates.
- Add stronger fallback handling when selectors fail on ChatGPT, Claude, Gemini, or Grok.
- Validate custom upload flow (file type and size limits, corrupted image guardrails).
- Improve runtime resilience around storage reads and live updates.

### Exit Criteria

- Background applies and removes successfully on all 4 supported products.
- No major UI breakage in core chat flows (new chat, send message, scroll history).
- Manual QA matrix completed for latest stable Chrome.

## `v1.2.0` - User Controls

### Scope

- Add chat color palette selectors for user and assistant bubbles.
- Add opacity controls for chat bubble readability and text visibility.
- Add per-site enable/disable toggles (different behavior by site).
- Add "Reset custom image" and lightweight settings management in popup.
- Improve accessibility in popup (focus states, keyboard navigation, labels).

### Exit Criteria

- Users can switch bubble colors from a palette and tune opacity without editing code.
- Color + opacity changes apply live and persist correctly after reload.
- Per-site configuration persists and applies correctly after page reload.
- Keyboard-only interaction works for primary popup actions.

## `v1.3.0` - Preconfigured Themes

### Scope

- Add preconfigured themes (bundled color + opacity presets) built on top of `v1.2.0` controls.
- Add new built-in background packs (minimum +6 images).
- Add optional background rotation mode (fixed interval).
- Add export/import settings to help users migrate between browsers/devices.
- Refresh popup layout for larger catalog handling.

### Exit Criteria

- Users can apply a preconfigured theme in one click, then still fine-tune palette/opacity controls.
- Theme switching remains responsive with larger built-in library.
- Import/export roundtrip works without data loss.
- Rotation feature can be safely paused or disabled at any time.

## `v1.4.0` - Avatars & Chat Identity

### Scope

- Add avatar selection for both user and assistant roles directly in the popup.
- Support built-in avatar packs (people, pets, mascot/bot styles) plus custom avatar uploads.
- Render sticker-style avatars next to chat bubbles, matching the playful "avatar beside the message" direction from the current concept image.
- Add avatar controls for size, shape, and spacing so users can tune how prominent avatars feel in the chat.
- Add display rules such as "show on every message" or "show only on the first message in a grouped turn".
- Handle native site avatar conflicts so custom avatars do not appear duplicated or overlap existing UI.

### Implementation Plan

1. Define avatar settings model in storage: role-based avatar source, selected preset/upload, visibility mode, size, and per-site overrides.
2. Extend the popup with an avatar picker, upload/remove actions, and a live preview beside sample user/assistant bubbles.
3. Add a rendering layer in the content script that injects avatar containers beside supported message blocks without breaking site layouts.
4. Build per-site alignment rules for ChatGPT, Claude, Gemini, and Grok so avatars stay attached to the correct side of each bubble.
5. Run QA for compact layouts, long conversations, zoomed pages, and fallback behavior when selectors or native avatars change.

### Exit Criteria

- Users can assign separate avatars for user and assistant messages without editing code.
- Built-in avatars and uploaded avatars both persist correctly after reload and browser restart.
- Avatars align with chat bubbles on all supported sites without covering actions, timestamps, or composer controls.
- Users can disable avatars or switch to a compact mode if the conversation area feels too crowded.
- The avatar feature remains visually consistent with theme, color, opacity, and brightness settings.

## `v2.0.0` - Release Maturity

### Scope

- Introduce automated checks (lint + packaging + smoke tests) in CI.
- Harden privacy posture and publish clearer data/storage policy.
- Complete release pipeline for repeatable builds and versioning.
- Begin Firefox compatibility track (Manifest adaptation + QA).

### Exit Criteria

- Repeatable release process documented and executable by a second maintainer.
- Chrome release candidate passes smoke tests on all supported sites.
- Firefox prototype build runs with core feature parity target defined.

## Per-Release Checklist

- Finalize scope and freeze release branch.
- Run regression matrix across ChatGPT, Claude, Gemini, Grok.
- Validate custom upload and storage migration behavior.
- Update `manifest.json` version and changelog notes.
- Build zipped artifact and test fresh install path.
- Publish release notes with known issues and rollback plan.

## Success Metrics

- Background apply success rate: `>= 99%` in controlled compatibility QA.
- Critical regressions found after release: `0`.
- Time to patch site DOM breakage: `< 48 hours`.
- Opt-in user feedback on customization value: improving release-over-release.
