# App Store listing (iOS)

App Store Connect app 6819387031. Paste each field into App Store Connect →
the app → the version page (or App Information for the app-level fields).
Character counts are in brackets; run `node store/check-lengths.js --fix` after edits.

## App Information (app-level)

**Name** [23 / 30]

```
ForkIt: Swipe to Decide
```

**Subtitle** [21 / 30]

```
Swipe right on dinner
```

**Primary category:** Food & Drink
**Secondary category:** Lifestyle

**Content rights:** "Does your app contain, show, or access third-party
content?" → **Yes**, and "I have the necessary rights". The app shows
restaurant data and photos from Google Places and Google Maps grounding, and
menu items from spoonacular, under those APIs' terms and with their
attribution shown in-app; the bundled example dish photos are Wikimedia
Commons images under CC licenses, credited on each card.

**Age rating:** see [review-and-privacy.md](review-and-privacy.md#age-rating).

## Version 1.0 page

**Promotional text** [142 / 170] — editable any time without a new build.

```
Stop the "I don't know, what do you want?" loop. Swipe on dishes with your group, and when most of you like the same place, dinner is decided.
```

**Keywords** [100 / 100] — comma-separated, no spaces. Words already in the name
and subtitle (forkit, swipe, decide, right, dinner) are indexed already, so
they are left out here.

```
food,restaurant,group,friends,where to eat,what to eat,menu,dish,date night,lunch,picker,recipe,vote
```

**Description** [1470 / 4000]

```
Can't agree on where to eat? ForkIt turns "I don't know, what do you want?" into a quick game.

Start a room, share the code with your group, and everyone swipes on dishes from restaurants nearby. Swipe right on the ones you'd eat, left on the ones you wouldn't. As soon as most of the group likes something at the same place, ForkIt calls the match and shows you where to go.

HOW IT WORKS
• Start a room and share the 6-character code or invite link
• Everyone swipes on dishes at the same time, on their own phone
• When a majority likes the same restaurant, it's a match
• Call, open the website, or get directions right from the match screen

DINE OUT
Pick breakfast, lunch or dinner and a search radius. ForkIt finds places near you that are open for that meal and shows dishes at each one: popular dishes and real menu items where we can find them, and suggestions based on the cuisine where we can't. Tap a card to flip through a restaurant's dishes, then swipe on the one that's showing.

COOK IN
Staying home? Swipe on recipes instead, and the group lands on something to make together. No location needed.

MADE FOR GROUPS
Friends, roommates, family, a date: anyone with the app can join with the code. Majority wins, so nobody has to be the one who decides. You'll get a notification when your group finds a match, even if you've left the app.

NO ACCOUNT NEEDED
Just type a name and go. No sign-up, no ads, no tracking. Rooms disappear when everyone leaves.
```

**Support URL**

```
https://forkit-server-production.up.railway.app/
```

**Marketing URL** (optional)

```
https://forkit-server-production.up.railway.app/
```

**Privacy Policy URL** (App Information)

```
https://forkit-server-production.up.railway.app/privacy
```

**Copyright**

```
2026 <legal name of the Apple developer account holder>
```

**What's New** — not shown for the first release. For later versions keep it
to a few plain lines of what changed for the user.

## TestFlight (external testing)

**Beta App Description**

```
ForkIt helps a group decide where to eat. Start a room, share the code, and everyone swipes on dishes from nearby restaurants. When most of you like the same place, it's a match. Try it with at least one other person to see a real match, or start a room on your own to try the flow.
```

**What to Test**

```
• Create a room in Dine Out, share the code, and have a second person join.
• Swipe through the cards: tap a card to flip between a restaurant's dishes.
• Check that the match screen shows the right place and that Call, Website and Directions work.
• Leave the app before the match and check that the notification arrives.
• Open an invite link (/join/CODE) on a phone with the app installed.
```

**Feedback email:** the same address as the contact on `/privacy`.
