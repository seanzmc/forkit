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

- **Screenshots and the Play feature graphic.** Hold these until the v1.0 UI
  is frozen; Apple rejects screenshots that don't match the app. Needed:
  iPhone 6.9" (1320 × 2868), Play phone screenshots (2–8), Play feature
  graphic (1024 × 500), Play icon (512 × 512, from `assets/images/icon.svg`).
- **Copyright line and App Review contact** in App Store Connect: fill in the
  developer's legal name and phone.
- **Store URLs on the home page.** Once a listing is live, set
  `APP_STORE_URL` / `PLAY_STORE_URL` on Railway.
- **Play app-signing SHA-256.** Once the app is on Play, append it to
  `ANDROID_CERT_SHA256` so invite links open the Play build.
