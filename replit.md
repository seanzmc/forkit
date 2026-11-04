# ForkIt - Food Matching App

A Tinder-style food decision app where groups swipe on dishes and get matched when the majority agrees.

## Architecture

**Frontend**: Expo Router (React Native) — port 8081
**Backend**: Express + WebSocket (ws) — port 5000

## App Flow

1. **Welcome** (`/`) — Enter your name (stored in AsyncStorage)
2. **Home** (`/home`) — Toggle between Dine Out / Cook In modes, create or join a session
3. **Lobby** (`/session/[code]`) — Waiting room with real-time member list and mode badge. Host starts the session
4. **Swipe** (`/swipe/[code]`) — Tinder-style swipe on food cards with haptic feedback
5. **Match** (`/match`) — Celebration screen showing the winning dish (adapts for dine-out vs cook-in)

## Session Modes

- **Dine Out** (`dine-out`): for one meal (breakfast/lunch/dinner), Google Places finds nearby restaurants open for it, with up to 4 dishes each: Gemini Maps grounding, chain menus, or cuisine-based suggestions. The deck is By place (one card per restaurant) or By dish. Match = per-restaurant majority.
- **Cook In** (`cook-in`): 20 curated home recipes with cookTime/servings/difficulty, and full recipes with a servings stepper and shopping list on the match screen. Match = per-dish majority. No location needed.

Mode is set on Home screen, sent in POST body when creating session, propagated via WebSocket `SessionState`.

## Key Features

- **Google Places API integration** - Fetches real nearby restaurants based on user location (dine-out mode)
- **Cook-in recipes** - 20 curated recipes with cookTime, servings, difficulty metadata
- **Location permissions** - expo-location for device GPS, web geolocation API fallback
- **Search radius selector** - 1mi / 3mi / 5mi / 10mi / 25mi options (dine-out only)
- Real-time WebSocket sync between group members
- Majority-rules matching (>50% of group must like same restaurant/dish)
- Fallback to made-up sample restaurants, labeled as such, when location or lookup is unavailable (dine-out)
- Undo, another round when nothing matches, in-game session panel, first-run walkthrough, match push notifications, invite links
- Shareable 6-character session codes
- Animated swipe cards with YUMMY/NOPE stamps, ratings, addresses
- Confetti celebration on match
- Permission flow: canAskAgain → Try Again, permanently denied → Open Settings

## Environment Variables

See CLAUDE.md for the full list. Main one:

- `GOOGLE_PLACES_API_KEY` - Nearby restaurant search (secret); absent means sample restaurants

## Design

- **Theme**: Dark charcoal background (`#0F0F0F`) with warm orange/amber accents
- **Font**: Poppins (400, 500, 600, 700)
- **Colors**: Accent `#FF6B35`, Gold `#FFB347`, Green `#4CAF50`, Red `#F44336`

## Tech Stack

- expo-router (file-based routing)
- react-native-reanimated (animations)
- @tanstack/react-query (API calls)
- WebSocket (ws) for real-time sync
- Google Places API (New) for restaurant data
- expo-location for GPS
- AsyncStorage for user preferences
- expo-haptics for haptic feedback
- expo-linear-gradient for visual polish

## File Structure

```
app/
  _layout.tsx        # Root layout with Poppins fonts
  index.tsx          # Welcome / name entry screen
  home.tsx           # Create / join session (mode toggle, location, radius)
  match.tsx          # Match celebration screen (adapts for cook-in/dine-out)
  session/[code].tsx # Session lobby (waiting room, mode badge)
  swipe/[code].tsx   # Swipe screen (main game, recipe chips for cook-in)
lib/
  food-data.ts       # Curated dishes + 20 cook-in recipes, SessionMode type
  websocket.ts       # WS URL helper and types
  query-client.ts    # API + React Query setup
server/
  index.ts           # Express server setup
  routes.ts          # REST API + WebSocket handler (mode-aware matching)
constants/
  colors.ts          # App color theme
```

## Key Types

- `Dish` interface: id, name, restaurant, cuisine, description, image, price, rating?, address?, placeId?, cookTime?, servings?, difficulty?, mode?
- `SessionMode` = `"dine-out" | "cook-in"` (from `lib/food-data.ts`)

## Running

- Backend: `npm run server:dev` (port 5000)
- Frontend: `npm run expo:dev` (port 8081)
