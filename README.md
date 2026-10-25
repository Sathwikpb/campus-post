# Campus Post

An independent, open-source browser extension that makes TU Ilmenau webmail easier to read. Not affiliated with TU Ilmenau, Google or Brave.

**[Download the latest release](https://github.com/Sathwikpb/campus-post/releases/latest)** · [Install & update](docs/INSTALL.md) · [Contribute](CONTRIBUTING.md) · [Privacy](docs/PRIVACY.md)

## What it does

- Floating assistant follows the email you open, without starting another inbox scan.
- Extracts key sentences, action requests, registration/meeting links and dates using local rules.
- Prefers the English section already included in bilingual emails.
- Optional browser-managed local translation for German-only emails; language availability depends on the browser and device, and the first download may need a click.
- Optional inbox scan and browser-local agenda. Creates Google Calendar drafts or .ics downloads for you to review and save.
- Local fallback view when the full embedded assistant cannot load.
- Toggle the panel with the toolbar icon, the floating button or **Alt+Shift+M**; a closed panel stays closed on the next page load.

No paid API, AI account or developer account is required. Core extraction works without AI. **Optional translation and browser summaries use on-device machine-learning models**; they are not dictionary-only translation. Google Translate is a manual fallback that sends the selected text to Google after you choose it.

## Install

1. Download `campus-post-0.3.6.zip` from Releases and extract it into a permanent folder.
2. Open your browser's Extensions page (`chrome://extensions` or `brave://extensions`), enable Developer mode, and choose **Load unpacked**.
3. Select the extracted folder containing `manifest.json`.
4. Refresh [TU webmail](https://webmail.tu-ilmenau.de/), sign in there and enable Campus Post's email tools after reading its disclosure.

To use the source checkout directly, select this repository's **extension** folder. Ready-built files are included; users do not need Node.js.

## Updates

Use **Get updates** in Campus Post to open the latest GitHub release. Replace files in the **same installed folder**, click **Reload** in Extensions and refresh webmail. Do not remove/reinstall for an ordinary update. A reload clears temporary session cache; saved settings and agenda normally stay with the same extension installation.

GitHub releases do **not** silently update an unpacked extension. Standard automatic updates on Chrome require store distribution (or managed enterprise deployment). No policy bypass, remote executable code or background download-and-execute updater is included. [Chrome distribution documentation](https://developer.chrome.com/docs/extensions/how-to/distribute)

## Development

Requires Node.js 24+, npm and Python 3 for packaging.

```sh
npm ci
npm run build
npm test
npm run package
```

`src/` holds maintainable source for the bundled parser and bridge. `extension/` holds browser UI, reader and build output. `tests/` uses fictional mail and simulated mailbox responses only. `dist/` contains the installable ZIP and checksum. See [architecture](docs/ARCHITECTURE.md).

GitHub Actions tests pushes and pull requests. Pushing a `v*` tag builds a release ZIP, checks that its version matches the tag and publishes a GitHub Release. No store credentials are required. To release: `npm run version -- X.Y.Z`, add a `## X.Y.Z` CHANGELOG section, `npm run build && npm test`, commit, then push tag `vX.Y.Z`. The ZIP is reproducible, so `SHA256SUMS.txt` can be checked against a local `npm run package`.

## Limits and release status

Early access. Rules can miss context, misread dates or omit attachments. Relative dates depend on the original sent date. Booking windows, cancellation messages and ambiguous times need review. Registration links do not register you; calendar drafts do not create events until you save them. Attachments and images are not translated. Only TU Ilmenau Roundcube webmail is supported; mobile and other universities are not supported.

Local regression tests passed, and browser translation was exercised with fictional messages. The final installed-version click-through on the real mailbox remains pending an extension reload. Do not treat this as a verified store release or universal browser-translation support.

## Privacy and permissions

Only `storage` and `https://webmail.tu-ilmenau.de/*` are requested. No developer backend, analytics or mailbox upload. TU login stays on TU's site. Recent decoded mail uses temporary extension session storage; preferences and saved agenda use local profile storage. Optional Google Translate and Calendar links disclose selected text/event details to Google. Read the [full policy](extension/privacy.html).

Never paste real emails, passwords, mailbox URLs containing tokens, activation links or meeting credentials into public issues. Use fictional examples.

## License

MIT for project code. Bundled libraries retain their own licenses in [THIRD_PARTY_NOTICES.txt](extension/THIRD_PARTY_NOTICES.txt). Contributions and bug reports are welcome.
