# Store listings

Source of truth for the App Store and Google Play listing text. Nothing here
is uploaded automatically: copy each field into App Store Connect or Play
Console by hand. Keeping it in the repo means listing changes get reviewed in
a PR alongside the app changes that make them necessary.

| File | What's in it |
| --- | --- |
| [app-store.md](app-store.md) | iOS name, subtitle, keywords, description, URLs, TestFlight text |
| [google-play.md](google-play.md) | Play title, short/full description, contact details, App content declarations |
| [review-and-privacy.md](review-and-privacy.md) | App Review notes, Apple privacy labels, Play Data safety, age ratings |
| [check-lengths.js](check-lengths.js) | `node store/check-lengths.js --fix` updates the character counts and fails if a field is over its limit |

## Still to do

- **Screenshots and the Play feature graphic.** Play phone screenshots are
  done (see below). Still needed: iPhone 6.9" (1320 × 2868), Play feature
  graphic (1024 × 500), Play icon (512 × 512, from `assets/images/icon.svg`).
  Apple rejects screenshots that don't match the app, so retake them if the
  UI changes before release.
- **Copyright line and App Review contact** in App Store Connect: fill in the
  developer's legal name and phone.
- **Store URLs on the home page.** Once a listing is live, set
  `APP_STORE_URL` / `PLAY_STORE_URL` on Railway.
- **Play app-signing SHA-256.** Once the app is on Play, append it to
  `ANDROID_CERT_SHA256` so invite links open the Play build.

## Screenshots

[screenshots/play/](screenshots/play/) holds the Play phone screenshots,
uploaded in file-name order: 1080 × 1920 PNG (9:16, which Play needs before
it will feature an app), from Android build 6 on an emulator. Play takes only
JPEG or 24-bit PNG with no alpha, and `adb screencap` writes RGBA, so flatten
retakes with `magick in.png -alpha off -define png:color-type=2 out.png`.

The swipe and match shots use a room built from the made-up sample
restaurants, not real ones: a real room shows a real business's name,
address and Google rating, which we don't want in marketing. A sample
room's match screen shows a notice instead of the Directions/Call/Website
buttons, so it isn't in the set. Take future screenshots (iOS included) the
same way: create the room with no location (`POST /api/sessions` without
`lat`/`lng`) and join it on the device through `/join/CODE`.
