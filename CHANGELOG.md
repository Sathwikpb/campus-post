# Changelog

## 0.4.0 — 2026-10-26

Checked against a full real TU mailbox (531 messages, June–October 2026): no crashes, ~1 ms per message. Fixes come from that run and are covered by fictional regression tests.

**Dates and times**
- Dotted clock times (`17.00 Uhr`, `um 9.30`, `6.30 - 8 p.m.`) are no longer read as dates; previously "Am 02.11 um 17.00 Uhr" became 20:26.
- Decimal numbers and version strings (`1.5 hours`, `605.1.15`) no longer create events.
- `Samstag, 5.9., 14-18 Uhr` and other day.month. dates followed by a comma are recognised, with German hour ranges (`14-18 Uhr`).
- English ranges with a shared a.m./p.m. (`4 - 5.30 p.m.`) get start and end times.
- German day ranges (`14.-21.04.2028`, `22. - 24.09.2026`) keep their start day.
- German weekdays in parentheses (`07.07.2026 (Dienstag)`) no longer create a second, wrong date; German weekday/date contradictions are flagged.
- Dates before the email was sent are marked as historical references, not appointments.
- A date-only mention of a day that also has a timed mention is merged into one event.
- Forum post timestamps (Moodle) are ignored; dates more than ~18 months away without a written year are dropped as misreadings.

**Language selection**
- English sections are found by splitting the email at rulers, decorated markers (`***German Version***`, `_____ English version below _____`) and greetings, then scoring each section, instead of relying on one marker format.
- German greetings copied above the English text are removed.
- Forwarded posts made entirely of `>` quoted lines are read instead of showing as empty.

**Key points**
- Greeting tails (`staff, and students,`), lone times, unsubscribe footers and bracketed URLs are no longer shown as key points; sentences that continued after a greeting are capitalised; `word.Next` without a space is split.

**Live view (TU Elastic skin)**
- Reads the sent date and sender from Elastic's `#message-header` (previously every live-view email showed "Original email date is missing" and "University email"), including German (`16.10.2026 14:58`) and relative (`Heute 09:15`) dates.
- Fix a blank panel when the full assistant frame is removed from the page by other software (seen with browser-automation extensions): Campus Post falls back to the live view and rebuilds the frame next time the panel opens.

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
