# Review notes, privacy answers, age ratings

These answers have to match what the app does and what `/privacy` says
(`server/templates/privacy-policy.html`). If a change touches data
collection (a new API, a new permission, keeping anything longer), update the
policy and these answers in the same PR.

## What the app actually handles

Facts the answers below rest on. Verify them again before submitting.

| Data | Where it goes | How long |
| --- | --- | --- |
| Display name (typed, max 24 chars) | Server memory; shown to others in the room | Until the session ends (every member has left or been away 15 min, server restart, or 1 h idle) |
| Random member ID (app-generated UUID, not tied to the device or any account) | AsyncStorage on the device; server memory while in a room | On the device until the app is deleted; on the server session only |
| Location (lat/lng, `Accuracy.Balanced`), dine-out only, from whoever creates the room | Server, then Google Places, at creation and on each new round. Never sent to Gemini, which gets only the restaurants' names, addresses and coordinates | Server memory while the room is open (`session.search`, for the next round's search); never logged or written to disk |
| Local weekday and time of day, dine-out only | Server, to check opening hours | Same as location |
| Swipes | Personal Cook In votes stay on the device until an invite. Dine Out and shared Cook In votes go to server memory. Native also keeps the last room’s votes on the device for reconnects. | On the server for the session. The local record is replaced by the next room or removed when the app is deleted. |
| Push token, if allowed | Server memory, then Expo push → APNs / FCM | Session only (kept after disconnect until the session is swept) |
| Display name, search radius, card style (By place / By dish), walkthrough seen | AsyncStorage on the device | Until the app is deleted |
| Update check: app version, platform, random install ID (expo-updates) | Expo's update service (EAS Update), on each launch | Held by Expo; never reaches our server |

No accounts, no analytics or crash SDKs, no ads, no advertising ID, no
background location, no database. All traffic is HTTPS / WSS.

## App Review notes (App Store Connect → App Review Information)

**Sign-in required:** No.

**Contact:** fill in the developer's first/last name, phone and email.

**Notes**

```
On first launch or upgrade, an optional four-step practice tour opens over the deck. Try the controls, or tap the X at any step. Practice does not send votes or invites. The deck opens on a Cook In recipe. Swipe right to like it, left to pass, or tap View recipe for the ingredients and method. There is no sign-in. Friends lets you optionally add a name and open How it works.

To test a match, use two devices.
1. On the first device, like the first Cook In recipe. Open Friends and tap Invite a friend.
2. On the second device, open the invite, or open Friends, tap Join with a code, and enter the displayed code. You can start swiping immediately.
3. Like the same recipe on the second device. Both devices show the match and its recipe. A match needs at least two different people and a strict majority of the room.

For Dine Out, tap Dine Out and allow location to see nearby restaurants. Tap the meal and distance to change the meal, radius or card style. By place lets you tap the sides of a photo to flip through dishes from that restaurant. The middle button undoes the last swipe. The same Friends flow shares the current restaurant deck. When the group likes a place, the match offers directions and the contact options available for that restaurant.

If everyone finishes with no match, a member can start another round. After voting in a shared room, you can allow notifications to hear about the match while the app is in the background.
```

## Apple App Privacy (App Store Connect → App Privacy)

**Do you or your third-party partners collect data from this app?** Yes.

**Tracking:** No data is used to track you. No App Tracking Transparency
prompt is needed.

| Apple data type | Collected | Linked to you | Tracking | Purpose |
| --- | --- | --- | --- | --- |
| Location → Precise Location | Yes | Yes | No | App Functionality |
| Contact Info → Name | Yes | Yes | No | App Functionality |
| User Content → Other User Content (swipes) | Yes | Yes | No | App Functionality |
| Identifiers → Device ID (push token) | Yes | Yes | No | App Functionality |

Notes on the choices:

- **Precise, not coarse.** `Accuracy.Balanced` returns full coordinates, and
  Apple counts lat/lng with three or more decimals as precise. To claim
  Coarse Location instead, the app would have to round coordinates before
  sending them.
- **Location is disclosed even though it never reaches a disk**: it is core
  to dine out, so it doesn't meet Apple's optional-disclosure criteria, and
  it goes on to Google.
- **Name** is a free-text display name, but users will often type their real
  first name, so it is disclosed as Name.
- **Name, swipes and push token are "linked".** There is no account, but the
  server keys the push token, display name and swipes by the same member ID
  for the session, so they are tied to a device while it lasts. Apple counts
  that as linked unless the data is de-identified before collection.
- **Location is "linked" too, the cautious reading.** It arrives in the
  create-session request, which carries no member ID or token, but the room
  keeps it for the next round's search, next to its members' names and
  tokens, until the room closes.
- **Push token** as Device ID is the cautious reading; many apps leave it
  out. Disclosing it costs nothing.
- **The expo-updates install ID** needs no new row: it is a random ID Expo
  uses to deliver updates and count devices, covered by the Device ID row
  above (App Functionality). Expo's own privacy manifest for it
  (`expo-eas-client`) declares no collected data.

## Google Play Data safety

**Does your app collect or share any of the required user data types?** Yes.
**Is all of the user data collected by your app encrypted in transit?** Yes.
**Do you provide a way for users to request that their data is deleted?** No.
There are no accounts and all server data is deleted automatically, at the
latest an hour after a room goes quiet; say so if the form offers a free-text
field.

| Play data type | Collected | Shared | Processed ephemerally | Required / optional | Purpose |
| --- | --- | --- | --- | --- | --- |
| Location → Approximate location | Yes | No | No | Optional | App functionality |
| Location → Precise location | Yes | No | No | Optional | App functionality |
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
  to built-in sample restaurants.
- **Location is not "processed ephemerally".** Play means used only to serve
  the request at hand; the room keeps it in memory for the next round's
  search until it closes.
- **Device or other IDs** also covers the random install ID expo-updates
  sends to Expo when checking for updates; no extra row.
- **Store reviews add no row.** The rating card after a second match is
  Google's own (Play In-App Review): the rating goes from the person to Google
  Play, and neither the app nor our server sees it.

## Age rating

### Apple (App Store Connect → Age Ratings)

Answer **None / No** to every content question (violence, sexual content,
profanity, horror, drugs, alcohol, gambling, contests, medical). Then:

- Unrestricted web access: **No**. Website, directions and delivery
  (DoorDash / Uber Eats search) links open the system browser, Maps or the
  delivery app; there is no in-app browser.
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
