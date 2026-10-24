# Install and update Campus Post 0.3.5

## New users

Download the extension ZIP from https://github.com/Sathwikpb/campus-post/releases/latest. Extract it into a permanent folder. In Chrome or Brave, open Extensions, enable Developer mode, choose Load unpacked, and select the folder containing manifest.json. Keep this folder. Refresh TU webmail and read the consent disclosure before enabling email tools.

Source-checkout users can load the `extension` directory directly; bundled files are included.

## Existing users

Download the newest ZIP and copy its contents over the files in the same installed directory. Click Reload for Campus Post on the Extensions page, then refresh webmail. Keep one copy enabled. Removing the extension may erase its stored agenda and settings; do not remove it for a routine update. Export your agenda before a major update. Temporary session cache may reset during reload/update.

Contributors using a Git clone can pull changes and reload the extension. When changing source, run `npm ci`, `npm run build` and `npm test` first.

## Reading and translation

Open an email to see its local digest. Inbox scanning is optional and five-minute checking is off by default. Existing English text is preferred. For German-only messages, prepare the local translation language once where supported. A browser-managed model download may require a click. Devices without that API can use the explicitly labelled manual Google Translate fallback. Optional browser summaries also require a supported on-device model. Core extraction needs neither.

Add to Google Calendar opens a draft on Google's site; review and Save there. Calendar file download is also available. Neither action registers you for an event.

## Update limitations

Get updates opens the GitHub releases page. It does not install anything. Chrome does not provide ordinary automatic updates for GitHub-installed unpacked extensions. A Chrome Web Store listing can provide automatic updates later, but requires the owner's store account and review. No fee is paid or store account created by this project.

## Troubleshooting

After updating, reload the extension and refresh webmail. Open one email; use the toolbar icon if the floating button is hidden. The local live view works when the full assistant frame fails; Inbox & agenda opens the full workspace. Unsupported mailbox layouts can still fail. Never post private mailbox contents or authentication details in a bug report.
