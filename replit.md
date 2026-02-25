# ForkIt - Food Matching App

A Tinder-style food decision app where groups swipe on dishes and get matched when the majority agrees on a restaurant.

## Architecture

**Frontend**: Expo Router (React Native) — port 8081
**Backend**: Express + WebSocket (ws) — port 5000

## App Flow

1. **Welcome** (`/`) — Enter your name (stored in AsyncStorage)
2. **Home** (`/home`) — Create a session or join one with a code
3. **Lobby** (`/session/[code]`) — Waitingroom with real-time member list. Host starts the session
4. **Swipe** (`/swipe/[code]`) — Tinder-style swipe on food cards with haptic feedback
5. **Match** (`/match`) — Celebration screen showing the winning dish and restaurant

## Key Features

- Real-time WebSocket sync between group members
- Majority-rules matching (>50% of group must like same restaurant)
- 15 curated food dishes from diverse cuisines with Unsplash images
- Shareable 6-character session codes
- Animated swipe cards with YUMMY/NOPE stamps
- Confetti celebration on match

## Design

- **Theme**: Dark charcoal background with warm orange/amber accents
- **Font**: Poppins (400, 500, 600, 700)
- **Colors**: Accent `#FF6B35`, Gold `#FFB347`, Green `#4CAF50`, Red `#F44336`

## Tech Stack

- expo-router (file-based routing)
- react-native-reanimated (animations)
- @tanstack/react-query (API calls)
- WebSocket (ws) for real-time sync
- AsyncStorage for user name persistence
- expo-haptics for haptic feedback
- expo-linear-gradient for visual polish

## File Structure

```
app/
  _layout.tsx        # Root layout with Poppins fonts
  index.tsx          # Welcome / name entry screen
  home.tsx           # Create / join session
  match.tsx          # Match celebration screen
  session/[code].tsx # Session lobby (waiting room)
  swipe/[code].tsx   # Swipe screen (main game)
lib/
  food-data.ts       # 15 curated dishes with Unsplash images
  websocket.ts       # WS URL helper and types
  query-client.ts    # API + React Query setup
server/
  index.ts           # Express server setup
  routes.ts          # REST API + WebSocket handler
constants/
  colors.ts          # App color theme
```

## Running

- Backend: `npm run server:dev` (port 5000)
- Frontend: `npm run expo:dev` (port 8081)
