# Review notes, privacy answers, age ratings

These answers have to match what the app does and what `/privacy` says
(`server/templates/privacy-policy.html`). If a change touches data
collection (a new API, a new permission, keeping anything longer), update the
policy and these answers in the same PR.

## What the app actually handles

Facts the answers below rest on. Verify them again before submitting.

| Data | Where it goes | How long |
| --- | --- | --- |
| Display name (typed, max 24 chars) | Server memory; shown to others in the room | Until the session ends (last member leaves, server restart, or 1 h) |
| Location (lat/lng, `Accuracy.Balanced`), dine-out only | Server, then Google Places and Gemini (Maps grounding) | Used for the lookup, never stored |
| Swipes | Server memory | Session only |
| Push token, if allowed | Server memory, then Expo push → APNs / FCM | Session only (kept after disconnect until the session is swept) |
| Display name, search radius | AsyncStorage on the device | Until the app is deleted |

No accounts, no analytics or crash SDKs, no ads, no advertising ID, no
background location, no database. All traffic is HTTPS / WSS.

## App Review notes (App Store Connect → App Review Information)

**Sign-in required:** No.

**Contact:** fill in the developer's first/last name, phone and email.

**Notes**

```
ForkIt has no accounts. Type any name on the first screen and tap "Let's Eat".

ForkIt is a group app: everyone in a room swipes on dishes, and it's a match when most of the room likes the same restaurant (dine out) or recipe (cook in). You can test it with one device, because a one-person room matches on your first right swipe.

Quickest test, no location needed:
1. On the home screen choose "Cook In", then tap "Create Room".
2. In the waiting room tap "Start Swiping".
3. Swipe right on any recipe. The match screen appears.

Dine out:
1. Choose "Dine Out" and allow location when asked. Location is used once, to find restaurants near you, and is not stored.
2. Pick a meal and a radius, then tap "Create Room". Building the room takes up to about 10 seconds while we look up nearby restaurants and their dishes.
3. Tap "Start Swiping". Tap the right or left side of a card's photo to flip through that restaurant's dishes; swipe to vote on the dish showing.
4. Swipe right on a dish to get a match, with Call, Website and Directions buttons.

To try it as a group, use a second device: tap the session code in the waiting room to share it, enter the code under "Join a Session" on the other device, then start. Match notifications arrive only if you allow notifications and have left the app when the match happens.
```

## Apple App Privacy (App Store Connect → App Privacy)

**Do you or your third-party partners collect data from this app?** Yes.

**Tracking:** No data is used to track you. No App Tracking Transparency
prompt is needed.

| Apple data type | Collected | Linked to you | Tracking | Purpose |
| --- | --- | --- | --- | --- |
| Location → Precise Location | Yes | No | No | App Functionality |
| Contact Info → Name | Yes | Yes | No | App Functionality |
| User Content → Other User Content (swipes) | Yes | Yes | No | App Functionality |
| Identifiers → Device ID (push token) | Yes | Yes | No | App Functionality |

Notes on the choices:

- **Precise, not coarse.** `Accuracy.Balanced` returns full coordinates, and
  Apple counts lat/lng with three or more decimals as precise. To claim
  Coarse Location instead, the app would have to round coordinates before
  sending them.
- **Location is disclosed even though it isn't stored**: it is core to dine
  out, so it doesn't meet Apple's optional-disclosure criteria, and it goes
  on to Google.
- **Name** is a free-text display name, but users will often type their real
  first name, so it is disclosed as Name.
- **Name, swipes and push token are "linked".** There is no account, but the
  server keys the push token, display name and swipes by the same member ID
  for the session, so they are tied to a device while it lasts. Apple counts
  that as linked unless the data is de-identified before collection.
- **Location is "not linked"**: it arrives in the create-session request,
  which carries no member ID or token, and is discarded after the lookup.
- **Push token** as Device ID is the cautious reading; many apps leave it
  out. Disclosing it costs nothing.

## Google Play Data safety

**Does your app collect or share any of the required user data types?** Yes.
**Is all of the user data collected by your app encrypted in transit?** Yes.
**Do you provide a way for users to request that their data is deleted?** No.
There are no accounts and all server data is deleted automatically within
an hour; say so if the form offers a free-text field.

| Play data type | Collected | Shared | Processed ephemerally | Required / optional | Purpose |
| --- | --- | --- | --- | --- | --- |
| Location → Approximate location | Yes | No | Yes | Optional | App functionality |
| Location → Precise location | Yes | No | Yes | Optional | App functionality |
| Personal info → Name | Yes | No | No | Required | App functionality |
| App activity → Other actions (swipes) | Yes | No | No | Required | App functionality |
| Device or other IDs (push token) | Yes | No | No | Optional | App functionality |

Notes:

- **Both location types**, because the manifest declares
  `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`.
- **"Shared: No" throughout.** Play doesn't count data sent to service
  providers acting for us (Google Places, Gemini, Expo, FCM, Railway) as
  sharing, nor showing your name to people you chose to play with.
- **Location optional**: cook in works without it, and dine out falls back
  to a built-in dish list.

## Age rating

### Apple (App Store Connect → Age Ratings)

Answer **None / No** to every content question (violence, sexual content,
profanity, horror, drugs, alcohol, gambling, contests, medical). Then:

- Unrestricted web access: **No**. Website and directions links open the
  system browser or Maps; there is no in-app browser.
- User-generated content / messaging: **No**. The only thing users see of
  each other is a display name inside a room they joined by code. If Apple
  asks about it, the answer is: no chat, no profiles, no public content.
- Advertising: **No**. In-app purchases: **No**.

Expected result: **4+**.

### Google Play (IARC questionnaire)

- Category: **All other app types** (or Reference/News/Educational if Play
  insists; not a game).
- Violence, fear, sexuality, gambling, language, controlled substances,
  crude humour: **No**.
- Do users interact or exchange content? **Yes**: users in a room see each
  other's display names. No chat, no media sharing.
- Does the app share the user's current location with other users? **No**.
- Digital purchases: **No**.

Expected result: **Everyone / PEGI 3**, possibly with a "Users Interact"
descriptor.

## Export compliance

`ITSAppUsesNonExemptEncryption` is `false` in `app.json` (HTTPS only), so App
Store Connect doesn't ask per build.
