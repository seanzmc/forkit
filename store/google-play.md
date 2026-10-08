# Google Play listing (Android)

Package `com.seandm.forkit`. Paste into Play Console → Grow users → Store
presence → Main store listing, and the declarations under Policy → App
content. Character counts are in brackets; run
`node store/check-lengths.js --fix` after edits.

## Main store listing

**App name** [23 / 30]

```
ForkIt: Swipe to Decide
```

**Short description** [75 / 80]

```
Swipe on dishes with your group. When most of you agree, dinner is decided.
```

**Full description** [1372 / 4000]

Play's metadata policy frowns on all-caps text, so this is the App Store
text with sentence-case headings.

```
Can't agree on where to eat? ForkIt turns "I don't know, what do you want?" into a quick game.

Start a room, share the code with your group, and everyone swipes on dishes from restaurants nearby. Swipe right on the ones you'd eat, left on the ones you wouldn't. As soon as most of the group likes something at the same place, ForkIt calls the match and shows you where to go.

How it works
• Start a room and share the 6-character code or invite link
• Everyone swipes on dishes at the same time, on their own phone
• When a majority likes the same restaurant, it's a match
• Call, open the website, or get directions right from the match screen

Dine out
Pick breakfast, lunch or dinner and a search radius. ForkIt finds places near you that are open for that meal and shows the dishes each one is known for. Tap a card to flip through a restaurant's dishes, then swipe on the one that's showing.

Cook in
Staying home? Swipe on recipes instead, and the group lands on something to make together. No location needed.

Made for groups
Friends, roommates, family, a date: anyone with the app can join with the code. Majority wins, so nobody has to be the one who decides. You'll get a notification when your group finds a match, even if you've left the app.

No account needed
Just type a name and go. No sign-up, no ads, no tracking. Rooms disappear when everyone leaves.
```

**App category:** Food & Drink
**Tags** (up to 5): Restaurants, Food & Drink, Social, Recipes, Group activities
(pick the closest ones Play offers; the list changes)

**Contact details**
- Email: the same address as the contact on `/privacy` (shown publicly)
- Website: `https://forkit-server-production.up.railway.app/`
- Phone: leave blank

**Privacy policy:** `https://forkit-server-production.up.railway.app/privacy`

## App content declarations

| Declaration | Answer |
| --- | --- |
| App access | All functionality is available without special access (no login). |
| Ads | No, the app does not contain ads. |
| Content rating | See [review-and-privacy.md](review-and-privacy.md#age-rating). |
| Target audience | 13–15, 16–17, 18 and over. Not 12 and under: the privacy policy says the app is not directed at children under 13, and picking a child age group pulls in the Families policy. |
| News app | No |
| COVID-19 contact tracing | No |
| Data safety | See [review-and-privacy.md](review-and-privacy.md#google-play-data-safety). |
| Government app | No |
| Financial features | None |
| Health | None |
| Location permissions | Foreground only (no `ACCESS_BACKGROUND_LOCATION`), so no background-location declaration is needed. |

## Testing track notes

- **Closed testing gate.** Personal developer accounts created after
  13 November 2023 must run a closed test with at least 12 opted-in testers
  for 14 days in a row before they can apply for production access. If this
  account is one of them, start the closed test as soon as the store
  listing, content rating and data safety form are done; those are required
  before a closed track can go out.
- **Release notes** for the testing track (500 chars each language):

  ```
  First test build. Start a room, share the code, and swipe on dishes from restaurants near you. Please try a match with at least one other person, and tell us if the notification or the invite link didn't work.
  ```
