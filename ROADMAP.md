# Feature Release Roadmap

This roadmap is for **My Chat Faces** after `v1.0.0` (current manifest version).

## North Star

Ship a stable, customizable chat background experience across supported AI sites, then prepare for broader distribution (Chrome Web Store growth + cross-browser support).

## Release Timeline (2026)

| Release | Target Window | Goal |
|---|---|---|
| `v1.1.0` | Mar 4 - Mar 17 | Stability and compatibility hardening |
| `v1.2.0` | Mar 18 - Apr 7 | User controls (palette + opacity) and quality-of-life features |
| `v1.3.0` | Apr 8 - Apr 28 | Preconfigured themes and content expansion |
| `v2.0.0` | Apr 29 - May 26 | Production readiness and platform expansion |

Sequencing rule: preconfigured themes ship only after user-facing color and opacity controls are stable in `v1.2.0`.

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

- Background apply success rate: `>= 99%` in manual/telemetry sampling.
- Critical regressions found after release: `0`.
- Time to patch site DOM breakage: `< 48 hours`.
- User feature adoption (custom or preset selection active): increasing release-over-release.
