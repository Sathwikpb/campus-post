# Architecture

- `extension/reader.js`: extracts the visible Roundcube message and original date.
- `src/bridge.mjs`: consent-checked same-origin mailbox operations and floating host UI. Returned Roundcube data literals are parsed, not executed.
- `src/live-view.mjs`: local popup fallback, message following and optional local translation with stale-result protection.
- `src/core.mjs`, `reading.mjs`, `clocks.mjs`: MIME decoding, English selection, links, conservative event extraction and calendar drafts. Built into `extension/core.js` and `bridge.js`.
- `extension/dashboard.js`: inbox, agenda, page translation and consent controls.
- `extension/session-cache.js`: bounded tab/account-separated decoded-message session cache.
- `extension/browser-tools.js`: optional browser-model capabilities.

The build bundles all executable code locally. There is no remote-code loader. The manifest intentionally has no GitHub host permission; update/source links are user-initiated navigation. There is no automatic installer or Google OAuth connection.

For changes: edit source modules, run build and tests, inspect bundles and review permissions. Add fictional regressions for parser mistakes. Do not copy real audit mail into this repository.
