#!/usr/bin/env bash
# Renders every carousel slide in social/posts/ from slide.html.
# Usage: social/render.sh   (from the repo root; needs Chrome and node_modules)
set -euo pipefail
cd "$(dirname "$0")/posts"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# name | query string (see slide.html). *word* = orange.
SLIDES=(
  "01-couples-1|type=hook&img=img/couple.jpg&title=“idk… what do *you* want?”&sub=every couple, every night"
  "01-couples-2|type=app&shot=swipe-together&title=Tap Friends. *Invite* your person.&sub=They join from their own phone. No sign-up."
  "01-couples-3|type=app&shot=dine-out&title=Swipe *dishes*, not arguments.&sub=Right if you'd eat it, left if you wouldn't."
  "01-couples-4|type=app&shot=match-dinner&low=1&title=You both like it? *Dinner's decided.*&sub=No vetoes. No “anything is fine.”"
  "01-couples-5|type=cta"

  "02-office-1|type=hook&img=img/office.jpg&title=the 11:58am *lunch* meeting&sub=the whole team. zero decisions."
  "02-office-2|type=app&shot=group-office&title=Drop one code in the *team chat*.&sub=Everyone joins from their desk."
  "02-office-3|type=app&shot=group-swipe-lunch&title=Everyone swipes. *At once.*&sub=No thread. No “I'm easy.”"
  "02-office-4|type=app&shot=match-lunch&low=1&title=Majority wins. *Lunch is decided.*&sub=One shared pick for the whole group."
  "02-office-5|type=cta&title=Swipe right on *lunch*"

  "03-friends-1|type=hook&img=img/friends.jpg&title=the group chat at 6pm on a *friday*&sub=“i'm down for whatever” ×4"
  "03-friends-2|type=app&shot=group-swipe-dinner&title=One link. *Everyone* swipes.&sub=From their own phone, wherever they are."
  "03-friends-3|type=app&shot=match-dinner&low=1&title=Most of you like it? *It's a match.*&sub=Strict majority, so nobody gets steamrolled."
  "03-friends-4|type=cta"

  "04-cookin-1|type=hook&img=img/fridge.jpg&title=staring into the fridge like it *owes us money*&sub=what's for dinner, at home edition"
  "04-cookin-2|type=app&shot=cook-in&title=*Cook In* mode: swipe on recipes.&sub=20 home-cooked dinners, swiped together."
  "04-cookin-3|type=app&shot=match-cook-in&low=1&title=The match comes with the *recipe*.&sub=Ingredients and steps, right on the match."
  "04-cookin-4|type=app&shot=recipe&title=Scaled to *your crew*.&sub=Tap %2B for servings, tick things off, share the list."
  "04-cookin-5|type=cta&title=Swipe right on *dinner in*"
)

mkdir -p out
rm -f out/*.png
for s in "${SLIDES[@]}"; do
  name="${s%%|*}"; query="${s#*|}"
  "$CHROME" --headless --hide-scrollbars --allow-file-access-from-files \
    --window-size=1080,1350 --virtual-time-budget=3000 \
    --screenshot="$PWD/out/$name.png" "file://$PWD/slide.html?$query" 2>/dev/null
  echo "out/$name.png"
done
