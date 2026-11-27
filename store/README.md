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

## Play icon and feature graphic

[graphics/](graphics/) holds what the Play listing uses besides screenshots:

- `play-icon-512.png`: 512 × 512 Play icon, from `assets/images/icon.png`.
- `feature-graphic.png`: 1024 × 500 feature graphic, rendered from
  `feature-graphic.html` with headless Chrome (the command is in its header
  comment). It shows the swipe and match screenshots, so re-render it when
  those are retaken.

## Screenshots

The English (U.S.) galleries show the swipe-first flow in version 1.0.2. Upload the opaque PNG files in filename order.

| Gallery | Native image size | Views |
| --- | --- | --- |
| [iPhone large](screenshots/iphone-1320x2868/) | 1320 × 2868 | Recipes, Dine Out, Friends, group match, tutorial |
| [iPhone medium](screenshots/iphone-1206x2622/) | 1206 × 2622 | Same five views |
| [iPhone Duo](screenshots/iphone-duo/) | 1398 × 2034 (cover display) | Same five views |
| [Google Play phone](screenshots/play/) | 1080 × 1920 | Recipes, ingredients, Your likes, Dine Out, Friends, group match, tutorial |

For retakes, use sample places in Dine Out. For Friends and the match, use a local Cook In room with two members who like the same recipe. Dismiss system permission prompts before capture. Render the Play feature graphic again when the swipe or match image changes.
