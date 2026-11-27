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

## Version 1.0.2

**Promotional text** [134 / 170] — editable any time without a new build.

```
Start on a recipe, swipe on nearby restaurants, and invite friends when you're ready. The choices you made before sharing still count.
```

**Keywords** [100 / 100] — comma-separated, no spaces. Words already in the name
and subtitle (forkit, swipe, decide, right, dinner) are indexed already, so
they are left out here.

```
food,restaurant,group,friends,where to eat,what to eat,menu,dish,date night,lunch,picker,recipe,vote
```

**Description** [1811 / 4000]

```
Can't agree on where to eat or what to cook? Open ForkIt and swipe on a recipe. See something you'd make tonight? Swipe right. Swipe left to pass, or tap Undo to bring the last card back. You can browse on your own and invite someone when you're ready.

COOK IN
Tap View recipe on any card to read the steps before you decide. Adjust the servings, check off ingredients you already have, and share the shopping list. Open Your likes to revisit your picks for this round. You can explore recipes without sharing your location.

DINE OUT
Tap Dine Out for restaurants near you. Choose breakfast, lunch or dinner, set the distance, and browse by place or by dish. Tap the sides of a restaurant card to see more of its dishes. ForkIt checks opening hours when available and labels suggested dishes and sample places. From a real restaurant match you can get directions, search for delivery, or call or visit its website when those details are available.

INVITE WHEN YOU'RE READY
Open Friends to send a link or share a six-character room code. Your friend gets the same deck, and the likes and passes you've already made count. You can join as Guest or add a name. See how far everyone has swiped while each person's votes stay private.

WHEN IT'S A MATCH
At least two people and more than half the group must agree. For Cook In, that's the same recipe. For Dine Out, you can like the pad thai and your friend can like the curry at the same restaurant. If everyone finishes without a match, deal another round. Turn on notifications after you vote in a shared room to hear when the group decides.

An optional tour points out the controls on your swipe screen. Try a swipe and watch the card edge turn green for a like or red for a pass. Close it with the X at any time, or replay it from Friends under How it works.
```

**Support URL**

```
https://forkit.seanzmc.com/
```

**Marketing URL** (optional)

```
https://forkit.seanzmc.com/
```

**Privacy Policy URL** (App Information)

```
https://forkit.seanzmc.com/privacy
```

**Copyright**

```
2026 <legal name of the Apple developer account holder>
```

**What's New** [220 / 4000]

```
ForkIt now opens on a recipe you can swipe right away. Try the hands-on tour, switch to Dine Out for nearby restaurants, or invite friends to the deck you're already using. Your earlier swipes count toward a group match.
```

## TestFlight (external testing)

**Beta App Description**

```
Start on a recipe, try the optional swipe tutorial, or switch to nearby restaurants. Invite a friend to your current deck to test group matching. Two different people must agree.
```

**What to Test**

```
• Follow the cues on the actual card, Undo, Dine Out and Friends. Try the X, then replay from Friends under How it works.
• During normal swiping, slowly drag right and left. The whole card edge should turn green or red alongside YUMMY or NOPE, and fade away as it returns to center.
• Browse Cook In alone. Open a recipe, adjust servings and share the shopping list.
• Like a card before inviting. Open Friends, share the link, and join on a second device. Check that the earlier vote counts and both devices see the match.
• Try a Dine Out deck by place and by dish. Check directions, delivery, maps, call and website actions where offered.
• Finish the deck with no agreement, start a new round, and try returning to a room from a link or match notification.
```

**Feedback email:** the same address as the contact on `/privacy`.
