# ForkIt social

The playbook for ForkIt's social accounts: who we are online, what we post,
and how each post gets made. Ready-to-post launch content is in
[posts/](posts/); `posts/*.html` are the sources, rendered to PNG with headless
Chrome (command in each file's header).

## The account

**Platforms, in order:** TikTok and Instagram (Reels + carousels) first, since
that's where "we can't decide what to eat" humor already lives. Cross-post
the same vertical videos to YouTube Shorts. Skip X and Facebook until there's
an audience asking for them.

**Handle:** same on every platform. In order of preference, take the first
one free everywhere:

1. `@forkitapp`
2. `@forkit.app` (Instagram and TikTok allow the dot; YouTube does too)
3. `@swipeforkit`
4. `@forkitdinner`

**Display name:** `ForkIt: Swipe to Decide` (matches the store name, so search
finds both).

**Profile photo:** `assets/images/icon.png` (the logo on its dark tile reads
well at 110 px; don't add text).

**Bio** (fits Instagram's 150 and TikTok's 80 for the first line alone):

```
Swipe right on dinner 🍴
Your group swipes, the app picks. No more "idk, you pick?"
Free on iPhone + Android ↓
```

**Link:** `https://forkit-server-production.up.railway.app/` (the public home
page). Once the store listings are live and `APP_STORE_URL` / `PLAY_STORE_URL`
are set on Railway, its chips turn into store links, so the bio link never
needs changing. Until then, testers come in through the tester guides.

**Account type:** Business/Creator on Instagram and TikTok (insights, link in
bio, and TikTok's commercial music library, which is the only music a brand
account may legally use).

## Voice

ForkIt is the friend who is *on the side of the hungry*. Petty about
indecision, never about people. Short sentences, lowercase is fine, one emoji
at most per caption.

- Yes: "she said 'anything is fine' then vetoed 11 restaurants. we built an app."
- Yes: "the group chat has been 'deciding' since 4:12pm"
- No: "Revolutionize your dining decisions with AI-powered matching!"
- Never punch down at a partner, coworker or friend. The villain is the
  indecision, not the person.

**Recurring line:** every post ends on the decision being made. The payoff
shot is always the match screen.

## Content pillars

Four pillars, rotated so no two posts in a row share one.

### 1. Couples: "idk, what do you want?"

The fight everyone has had. ForkIt is the peace treaty.

| # | Format | Hook (first 2 s, on screen) | Beat |
|---|---|---|---|
| C1 | Skit | "date night planning, day 3" | Couple on the couch, the "idk what do you want" loop, one of them opens a room, both swipe, match screen, silence, high five. |
| C2 | POV | "POV: you said 'anything is fine'" | Partner reads off 6 options, each vetoed with a face. Cut to them swiping instead. |
| C3 | Text-on-screen | "things my partner has said 'no' to tonight" | Scrolling list of vetoed dinners, ends on "things we both swiped right on: 1" + match screen. |
| C4 | Carousel | "how to decide where to eat without breaking up" | Slide per step: start a room, share the code, swipe, match. |
| C5 | Duet/stitch bait | "rate my partner's dinner veto excuses" | Invite stitches with their own excuses. |

### 2. The office: lunch by committee

The whole team, one chat thread, forty minutes of "I'm easy."

| # | Format | Hook | Beat |
|---|---|---|---|
| O1 | Skit | "the 11:58am lunch meeting" | Someone asks "where are we going?", the room freezes, someone drops a room code in the chat, everyone swipes at their desk, match in 30 seconds. |
| O2 | Mockumentary | "day 47 of the lunch debate" | Talking-head interviews, The Office style (original characters, not a parody of the show). |
| O3 | Meme | "the coworker who says 'I'm easy' and then hates everything" | Single image + caption. |
| O4 | Stat-style | "average office lunch decision: 23 minutes. ours: 41 seconds." | Screen-recorded timer over a real swipe session. (Only use numbers you actually timed.) |

### 3. The friend group: where are we meeting?

The group chat that never lands on a place.

| # | Format | Hook | Beat |
|---|---|---|---|
| F1 | Group chat screen | "the group chat at 6pm on a friday" | Fake chat thread (made by us, generic names) spirals; someone drops a ForkIt invite link; next message: the match. |
| F2 | Skit | "every friend group has these 4 people" | The vetoer, the "I'm fine with anything", the one who's already eaten, the one who just wants tacos. ForkIt makes it a majority vote. |
| F3 | Street-style | "we made strangers pick dinner together" | Real people, real swipes (needs a release form; see below). |
| F4 | Carousel | "the majority rule, explained" | 2/2, 2/3, 3/4, 3/5: strict majority, so nobody gets steamrolled. |

### 4. Cook In: what's for dinner at home?

Cook In mode: 20 recipes, swipe, the match comes with the recipe, scalable
servings and a shared shopping list.

| # | Format | Hook | Beat |
|---|---|---|---|
| K1 | Skit | "staring into the fridge like it owes us money" | Couple at an open fridge, swipe Cook In, match, cut to the meal being made. |
| K2 | Recipe reel | "we let the app pick dinner, then made it" | Match screen, then a fast cooking montage of that recipe, ending on the plate. Real cooking, filmed. |
| K3 | Roommates | "4 roommates, 1 kitchen, 0 agreement" | Cook In room, match, shopping list shared, everyone grabs one item. |
| K4 | Feature | "it scales the recipe for you" | Screen recording: servings stepper 2 → 6, amounts change. |

### Recurring formats (once there's an audience)

- **Match of the week:** followers send their match screen, we repost one.
- **"You decide" polls:** Story poll between two dishes; the comments pick
  next week's Cook In reel.
- **Reply videos:** answer comments ("does it work for 10 people?") with a
  screen recording.

## How a post gets made

Every video is the same three parts:

1. **Hook (1–3 s):** the relatable fight. AI-generated with Higgsfield, or
   filmed.
2. **The app (3–8 s):** a *real* screen recording of ForkIt. Never an
   AI-generated phone screen: generated UIs show an app that doesn't exist,
   which is false advertising and gets flagged by the stores' review teams
   if they see it.
3. **Payoff (1–2 s):** the match screen, then the reaction.

### Higgsfield

- Images: ~36 credits each (`nano-banana-2`). Video: ~140 credits per second
  (`seedance-2-5-t2v`), so a 5 s hook is ~700.
- One scene per `generate_image` call, written in `description`. Its
  `prompts` list (several scenes in one call) is ignored without a character:
  every image comes back as a generic influencer selfie.
- Start the description with "Wide shot of …" and name everyone in it, or
  you get a single-person portrait.
- Prompt every phone with "screens facing away from the camera" so no fake UI
  appears; the real screen recording is cut in after.
- Check video orientation. The first 9:16 clip came back with the scene
  rotated 90° inside the frame. The fix (rotate upright, then centre it over a
  blurred copy at 1080×1920, leaving room for captions above and below):
  ```bash
  ffmpeg -i raw.mp4 -filter_complex "[0:v]transpose=2,split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,eq=brightness=-0.15[bg];[b]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac out.mp4
  ```
- Listen before posting: generated audio can garble the line.
- Ask for "no text" in images; captions go on in the editor, where they're
  legible and on-brand.
- Don't build ForkIt content on the Riley characters; scenes are generated
  without a character, or with ForkIt-only characters if we ever want a
  recurring cast.

### Rules that keep the account safe

- **Label AI content.** TikTok and Instagram require the "AI-generated" label
  on realistic generated people or scenes. Turn it on for every post that
  uses a Higgsfield clip or image.
- **Sample restaurants only in screen recordings.** Real Google Places photos
  and data can't be reused in marketing under Google's terms. Record dine-out
  with location off (the app falls back to sample restaurants) or use Cook
  In, as the Play screenshots do.
- **No real brands.** No real restaurant chains or their logos in generated
  images, captions or recordings.
- **Music:** only TikTok's Commercial Music Library / Instagram's licensed
  business audio. Trending songs are off-limits to brand accounts.
- **Real people on camera** (street-style, friends): get a signed release
  before posting.
- **Privacy:** fake group chats use made-up names and no real numbers.

## Cadence

3–4 posts a week. Post between 11:30–12:30 (lunch decision time) or
17:00–19:00 (dinner decision time) local. Reply to every comment in the first
hour.

### First two weeks

| Day | Pillar | Post |
|---|---|---|
| 1 | Couples | C1 skit, built from `posts/hook-couple.mp4` + screen recording |
| 2 | — | Carousel `posts/01-couples-*.png` (pin it) |
| 4 | Office | `posts/02-office-*.png` carousel |
| 6 | Friends | `posts/03-friends-*.png` carousel |
| 8 | Cook In | `posts/04-cookin-*.png` carousel |
| 9 | Couples | C3 text-on-screen |
| 11 | Office | O1 skit |
| 13 | Cook In | K2 recipe reel |

## Hashtags

3–5 per post, mixed sizes. Pick from:
`#whattoeat #dinnerideas #datenight #couplesbelike #officelife #lunchbreak
#friendgroup #foodtok #dinnertonight #whatsfordinner #cookathome`
