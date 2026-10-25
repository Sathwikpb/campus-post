# Changelog

## 0.3.7 — 2026-10-26

- Fix a blank panel when the full assistant frame is removed from the page by other software (seen with browser-automation extensions): Campus Post now falls back to the local live view and rebuilds the frame the next time the panel opens.

## 0.3.6 — 2026-10-26

- Remember when the floating panel is closed instead of reopening it on every webmail page load.
- Add a keyboard shortcut to show or hide Campus Post (Alt+Shift+M by default; change it at `chrome://extensions/shortcuts`).
- Lighter background work: the live view and full assistant stop following the open email while the webmail tab is hidden, and consent/settings are cached instead of read from storage several times a second.
- Reproducible release ZIP: identical source now produces an identical checksum.
- Release notes now contain only the current version's changes; fixed a garbled character in the 0.3.4 changelog heading.
- Add `npm run version` to update every version label at once, plus regression tests for the panel memory, consent cache and packaging.

## 0.3.5 — 2026-10-24

- Wait for a working mailbox connection before replacing the local live-email view.
- Connect automatically even when the full assistant is opened without a tab parameter.
- Reconnect when Everything about this email is clicked while disconnected.
- Keep optional model-download status separate from mailbox errors; time out stalled summary setup.
- Improve classic Roundcube subject extraction.
- Add simulated startup, model-timeout and classic preview regression tests. An actual Mac has not been tested.

## 0.3.4 — 2026-10-24

- Publish MIT-licensed source, synthetic regression tests and reproducible build/package scripts.
- Add Get updates links to the live view and setup page, opening GitHub Releases without new permissions.
- Add contributor and privacy guidance and automated CI/release packaging.
- Correct outdated installation instructions: scans are optional; automatic checking starts off.
- Includes 0.3.3 English-section, date/time/venue, German-only detection and live fallback fixes.

Installed mailbox verification remains pending reload; local test results are not a completed store review.
