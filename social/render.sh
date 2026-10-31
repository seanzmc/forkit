#!/usr/bin/env bash
# Renders every carousel slide in social/posts/ from slide.html.
# Usage: social/render.sh   (from the repo root; needs Chrome and node_modules)
set -euo pipefail
cd "$(dirname "$0")/posts"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# name | query string (see slide.html). *word* = orange.
SLIDES=(
  "01-couples-1|type=hook&img=img/couple.jpg&title=“idk… what do *you* want?”&sub=every couple, every night"
  "01-couples-2|type=app&shot=03-lobby&title=Start a room. Send the *code*.&sub=You both join from your own phone."
  "01-couples-3|type=app&shot=04-swipe-card&title=Swipe on *dishes*, not arguments.&sub=Right if you'd eat it, left if you wouldn't."
  "01-couples-4|type=app&shot=06-match&title=You both like it? *Dinner's decided.*&sub=No vetoes. No “anything is fine.”"
  "01-couples-5|type=cta"

  "02-office-1|type=hook&img=img/office.jpg&title=the 11:58am *lunch* meeting&sub=the whole team. zero decisions."
  "02-office-2|type=app&shot=03-lobby&title=Drop one code in the *team chat*.&sub=Everyone joins from their desk."
  "02-office-3|type=app&shot=05-swiping&title=Everyone swipes. *At once.*&sub=No thread. No “I'm easy.”"
  "02-office-4|type=app&shot=06-match&title=Majority wins. *Lunch is decided.*&sub=Directions, website and phone number right there."
  "02-office-5|type=cta&title=Swipe right on *lunch*"

  "03-friends-1|type=hook&img=img/friends.jpg&title=the group chat at 6pm on a *friday*&sub=“i'm down for whatever” ×4"
  "03-friends-2|type=app&shot=05-swiping&title=One invite link. *Everyone* swipes.&sub=From their own phone, wherever they are."
  "03-friends-3|type=app&shot=06-match&title=Most of you like it? *It's a match.*&sub=Strict majority, so nobody gets steamrolled."
  "03-friends-4|type=cta"

  "04-cookin-1|type=hook&img=img/fridge.jpg&title=staring into the fridge like it *owes us money*&sub=what's for dinner, at home edition"
  "04-cookin-2|type=app&shot=07-cook-in&title=*Cook In* mode: swipe on recipes.&sub=20 home-cooked dinners, swiped together."
  "04-cookin-3|type=hook&img=img/cooking.jpg&title=Match comes with the *recipe*.&sub=Scaled to your crew, plus a shared shopping list."
  "04-cookin-4|type=cta&title=Swipe right on *dinner in*"
)

mkdir -p out
for s in "${SLIDES[@]}"; do
  name="${s%%|*}"; query="${s#*|}"
  "$CHROME" --headless --hide-scrollbars --allow-file-access-from-files \
    --window-size=1080,1350 --virtual-time-budget=3000 \
    --screenshot="$PWD/out/$name.png" "file://$PWD/slide.html?$query" 2>/dev/null
  echo "out/$name.png"
done
