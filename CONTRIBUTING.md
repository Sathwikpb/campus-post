# Contributing

Open an issue with a fictional reproduction, browser/version, extension version, and expected versus observed behavior. Do not include real email content, addresses, cookies, session tokens, activation links or meeting passwords.

For a pull request: use Node.js 24+, run `npm ci`, `npm run build`, `npm test`, then `npm run package`. Commit source and rebuilt extension output. Explain user-visible behavior, validation and any permission/storage changes. Keep extraction functional without optional browser models. Preserve consent, local processing, account separation and stale-result guards.

Check actual preview-pane and full-message layouts where possible. Clearly distinguish synthetic tests from authenticated installed-browser verification. Contributions are under the MIT license.
