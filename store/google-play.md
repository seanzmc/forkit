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

**Short description** [80 / 80]

```
Swipe on recipes or nearby restaurants. Invite friends to the deck you're using.
```

**Full description** [1811 / 4000]

Play's metadata policy frowns on all-caps text, so this is the App Store
text with sentence-case headings.

```
Can't agree on where to eat or what to cook? Open ForkIt and swipe on a recipe. See something you'd make tonight? Swipe right. Swipe left to pass, or tap Undo to bring the last card back. You can browse on your own and invite someone when you're ready.

Cook in
Tap View recipe on any card to read the steps before you decide. Adjust the servings, check off ingredients you already have, and share the shopping list. Open Your likes to revisit your picks for this round. You can explore recipes without sharing your location.

Dine out
Tap Dine Out for restaurants near you. Choose breakfast, lunch or dinner, set the distance, and browse by place or by dish. Tap the sides of a restaurant card to see more of its dishes. ForkIt checks opening hours when available and labels suggested dishes and sample places. From a real restaurant match you can get directions, search for delivery, or call or visit its website when those details are available.

Invite when you're ready
Open Friends to send a link or share a six-character room code. Your friend gets the same deck, and the likes and passes you've already made count. You can join as Guest or add a name. See how far everyone has swiped while each person's votes stay private.

When it's a match
At least two people and more than half the group must agree. For Cook In, that's the same recipe. For Dine Out, you can like the pad thai and your friend can like the curry at the same restaurant. If everyone finishes without a match, deal another round. Turn on notifications after you vote in a shared room to hear when the group decides.

An optional tour points out the controls on your swipe screen. Try a swipe and watch the card edge turn green for a like or red for a pass. Close it with the X at any time, or replay it from Friends under How it works.
```

**App category:** Food & Drink
**Tags** (up to 5): Restaurants, Food & Drink, Social, Recipes, Group activities
(pick the closest ones Play offers; the list changes)

**Contact details**
- Email: `support.forkit@seanzmc.com`
- Website: `https://forkit.seanzmc.com/`
- Phone: leave blank

**Privacy policy:** `https://forkit.seanzmc.com/privacy`

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
  before a closed track can go out. This account is one: the closed track
  ("Closed testing - Alpha", testers = the `forkit-testers@googlegroups.com`
  Google Group) was sent for review on 29 October 2026 with build 8, and
  `eas submit` sends new builds there (`track: "alpha"` in eas.json).
  Testers join with [docs/android-testers-guide.html](../docs/android-testers-guide.html).
- **Release notes** for the testing track (500 chars each language):

  ```
  ForkIt now opens on a recipe. Try the optional practice tour, undo a swipe, switch to Dine Out, and invite a friend after voting. Join by link or code and test a match with another person.
  ```
