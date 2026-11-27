import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useIsFocused } from "expo-router";
import { SafeAreaView, useSafeAreaFrame, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSharedValue } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { DishCard, type DishCardHandle } from "./DishCard";
import { DineOptions } from "./DineOptions";
import { HowItWorks, type TourStep } from "./HowItWorks";
import { MatchActions } from "./MatchActions";
import { RecipeDetails } from "./RecipeDetails";
import { SampleRoomNotice } from "./SampleRoomNotice";
import { SessionPanel } from "./SessionPanel";
import { SheetButton, SwipeSheet, sheetStyles } from "./SwipeSheet";
import { SwipeReview } from "./SwipeReview";
import { dineRequest, preferredDineSettings, rememberDineSettings, type DineSettings } from "@/lib/dine-out";
import { mealForTime, shuffleDishes, shuffleRecipes, type Dish, type SessionMode } from "@/lib/food-data";
import { getMemberId } from "@/lib/member-id";
import { getPushToken } from "@/lib/push";
import { apiRequest } from "@/lib/query-client";
import { shareSessionCode } from "@/lib/share-session";
import { rememberSwipes, type OwnVotes, type ReviewedSwipe, type SwipeVote } from "@/lib/swipe-review";
import { useSwipeRoom } from "@/lib/use-swipe-room";
import type { SessionState, WsMessage } from "@/lib/websocket";

type DeckState = {
  mode: SessionMode;
  dishes: Dish[];
  history: ReviewedSwipe[];
  dishIndex: number;
  code?: string;
  shared: boolean;
  round: number;
  session?: SessionState;
  settings?: DineSettings;
};
type Panel = "friends" | "settings" | "round" | "likes" | "history" | "detail" | "sample" | null;
type Tour = { step: TourStep; deck: DeckState };
const TOUR_KEY = "seenOnScreenSwipeTourV2";
let tourDismissed = false;

async function needsSwipeTour() {
  if (tourDismissed) return false;
  const seen = await AsyncStorage.getItem(TOUR_KEY);
  return !seen && !tourDismissed;
}

function rememberTourDismissal() {
  tourDismissed = true;
  void AsyncStorage.setItem(TOUR_KEY, "1").catch(() => {});
}

const INITIAL_SETTINGS: DineSettings = { meal: "dinner", deck: "places", radius: 8047 };
function cookDeck(): DeckState {
  return { mode: "cook-in", dishes: shuffleRecipes(), history: [], dishIndex: 0, shared: false, round: 1 };
}
function guestDeck(code: string): DeckState {
  return { mode: "cook-in", dishes: [], history: [], dishIndex: 0, shared: true, code, round: 1 };
}
function cardKey(dish: Dish, byDish: boolean) {
  return byDish || dish.mode === "cook-in" ? dish.id : (dish.placeId ?? dish.restaurant);
}
function groupCards(dishes: Dish[], byDish: boolean) {
  const groups = new Map<string, Dish[]>();
  for (const dish of dishes) {
    const key = cardKey(dish, byDish);
    const group = groups.get(key);
    if (group) group.push(dish);
    else groups.set(key, [dish]);
  }
  return [...groups.values()];
}
function choices(state: DeckState): OwnVotes {
  return { round: state.round, swipes: Object.fromEntries(state.history.map((s) => [s.dish.id, s.vote])) };
}
async function createDeck(body: object): Promise<{ code: string; dishes: Dish[]; session: SessionState }> {
  const res = await apiRequest("POST", "/api/sessions", { ...body, swipeFirst: true });
  const room = await res.json();
  if (room.session?.status !== "swiping" || !room.dishes?.length)
    throw new Error("This server couldn’t open your deck. Try again shortly.");
  return room;
}

export function SwipeScreen({ initialCode }: { initialCode?: string }) {
  const focused = useIsFocused();
  const [liveDeck, setDeck] = useState<DeckState>(() => (initialCode ? guestDeck(initialCode) : cookDeck()));
  const [tour, setTour] = useState<Tour | null>(null);
  const tourHistory = useRef<Tour[]>([]);
  const target = useRef<React.ComponentRef<typeof View>>(null);
  const deck = tour?.deck ?? liveDeck;
  const card = useRef<DishCardHandle>(null);
  const reveal = useSharedValue(0);
  const [outgoing, setOutgoing] = useState<{ dishes: Dish[]; index: number; key: string } | null>(null);
  const latest = useRef(liveDeck);
  const personal = useRef<Partial<Record<SessionMode, DeckState>>>({});
  const mounted = useRef(true);
  const locked = useRef(false);
  const sharePending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [lost, setLost] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [detail, setDetail] = useState<Dish | null>(null);
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const nameRef = useRef("");
  // The name last written to storage and sent to the room, so blur,
  // submit and closing the sheet save it once.
  const savedName = useRef("");
  const [showHint, setShowHint] = useState(true);
  const [loadingRound, setLoadingRound] = useState(false);
  const insets = useSafeAreaInsets();
  const { height } = useSafeAreaFrame();
  const compact = height - insets.top - insets.bottom < 620;
  useEffect(() => {
    mounted.current = true;
    let active = true;
    Promise.all([getMemberId(), AsyncStorage.getItem("userName").catch(() => null)]).then(([id, stored]) => {
      if (!active) return;
      if (!nameRef.current) {
        nameRef.current = stored ?? "";
        savedName.current = nameRef.current.trim();
        setName(nameRef.current);
      }
      setUserId(id);
    });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);
  const startTour = useCallback(() => {
    const current = latest.current;
    // Keep the current card and group visible. A completed deck needs a card
    // to practice on. Room updates continue to go to the live deck throughout.
    const byDish = (current.session?.deck ?? current.settings?.deck) === "dishes";
    const votes = new Set(current.history.map(({ dish }) => cardKey(dish, byDish)));
    const available = current.dishes.some(dish => !votes.has(cardKey(dish, byDish)));
    const practice = !current.dishes.length ? cookDeck() : available ? current : { ...current, history: [], dishIndex: 0 };
    setOutgoing(null);
    setNotice("");
    setPanel(null);
    sharePending.current = false;
    tourHistory.current = [];
    setTour({ step: "swipe", deck: practice });
  }, []);
  const waitingForDeck = !!liveDeck.code && (!liveDeck.dishes.length || liveDeck.session?.status === "lobby");
  useEffect(() => {
    if (!focused || tour || panel || busy || waitingForDeck) return;
    let active = true;
    needsSwipeTour().then((needed) => {
      if (active && needed) startTour();
    }).catch(() => {});
    return () => { active = false; };
  }, [focused, tour, panel, busy, waitingForDeck, startTour]);

  const closeTutorial = useCallback(() => {
    rememberTourDismissal();
    tourHistory.current = [];
    setOutgoing(null);
    setPanel(null);
    setTour(null);
  }, []);
  function advanceTour(step: TourStep, practiceDeck = deck) {
    if (!tour) return;
    tourHistory.current.push(tour);
    setTour({ step, deck: practiceDeck });
  }
  function backInTour() {
    const previous = tourHistory.current.pop();
    if (!previous) return;
    setOutgoing(null);
    setPanel(previous.step === "round" ? "round" : null);
    setTour(previous);
  }
  const touring = !!tour;
  useEffect(() => {
    if (!touring || !focused || panel) return;
    if (Platform.OS === "web") {
      const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeTutorial(); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { closeTutorial(); return true; });
    return () => sub.remove();
  }, [touring, focused, panel, closeTutorial]);
  function update(next: DeckState) {
    latest.current = next;
    setDeck(next);
  }
  function saveVotes(next: DeckState) {
    update(next);
    if (next.code && userId) rememberSwipes(next.code, userId, next.round, next.history);
  }
  function open(which: Panel) {
    if (panel === "friends" && which !== "friends") saveName();
    if (which !== "friends") sharePending.current = false;
    setNotice("");
    setPanel(which);
  }
  function receive(msg: WsMessage, sent?: OwnVotes) {
    const previous = latest.current;
    if ("session" in msg && msg.session.code !== previous.code) return;
    if (msg.type === "joined" || msg.type === "game_started" || msg.type === "new_round") {
      const session = msg.session,
        round = session.round ?? 1;
      const restored = !previous.dishes.length && sent?.round === round ? sent.swipes : {};
      if (round !== previous.round) setOutgoing(null);
      const known = new Map(msg.dishes.map((dish) => [dish.id, dish]));
      const history =
        previous.dishes.length && round === previous.round
          ? previous.history.flatMap((s) =>
              known.has(s.dish.id) ? [{ dish: known.get(s.dish.id)!, vote: s.vote }] : []
            )
          : Object.entries(restored).flatMap(([id, vote]) =>
              known.has(id) ? [{ dish: known.get(id)!, vote }] : []
            );
      const next = {
        ...previous,
        mode: session.mode,
        session,
        history,
        round,
        dishes: msg.dishes,
        dishIndex: round === previous.round ? previous.dishIndex : 0,
        shared: previous.shared || session.members.length > 1,
      };
      saveVotes(next);
      setLost(false);
      setLoadingRound(false);
      return;
    }
    if (msg.type === "member_joined" || msg.type === "member_left") {
      update({ ...previous, session: msg.session, shared: previous.shared || msg.session.members.length > 1 });
    } else if (msg.type === "swipe_update" && previous.session) {
      const members = previous.session.members.map((m) =>
        m.id !== msg.memberId
          ? m
          : {
              ...m,
              swiped:
                "swiped" in msg ? msg.swiped : Math.max(0, (m.swiped ?? 0) + (msg.vote === "undo" ? -1 : 1)),
            }
      );
      update({ ...previous, session: { ...previous.session, members } });
    } else if (msg.type === "round_loading") {
      setLoadingRound(true);
    } else if (msg.type === "match") {
      sharePending.current = false;
      setTour(null);
      setPanel(null);
      if (previous.dishes.length && previous.code)
        rememberSwipes(previous.code, userId, previous.round, previous.history);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/match",
        params: {
          dish: JSON.stringify(msg.dish),
          code: msg.session.code,
          meal: msg.session.meal,
          sample: msg.session.sample,
        },
      });
    } else if (msg.type === "error") {
      sharePending.current = false;
      if (msg.message === "Session not found" && previous.dishes.length) {
        update({
          ...previous,
          code: undefined,
          shared: false,
          session: previous.mode === "cook-in" ? undefined : previous.session,
        });
        setLost(previous.mode === "dine-out");
        setNotice(
          previous.mode === "cook-in"
            ? "This room has ended. Your swipes are here, and you can invite again."
            : "This room has ended. Your swipes are here. Refresh nearby places to invite again."
        );
      } else {
        setLost(true);
        setNotice(msg.message === "Session not found" ? "This room has ended." : msg.message);
      }
    }
  }
  const room = useSwipeRoom(
    focused ? liveDeck.code : undefined,
    userId,
    () => {
      const current = latest.current;
      return {
        name: nameRef.current.trim() || "Guest",
        votes: current.dishes.length ? choices(current) : undefined,
      };
    },
    receive
  );
  const connected =
    focused && room.status === "connected" && !!liveDeck.session?.members.some((m) => m.id === userId) && !lost;
  const send = room.send;
  // Only rooms from older apps wait in a lobby (this app's rooms start
  // swiping when created). Hosting one can fall to this device when the old
  // host steps away, so starting is left to a tap: others may still be joining.
  const canStart = connected && deck.session?.status === "lobby" && deck.session.hostId === userId;
  const count = deck.history.length;
  useEffect(() => {
    if (touring || !liveDeck.code || !liveDeck.shared || !connected || !sharePending.current || panel !== "friends") return;
    sharePending.current = false;
    const code = liveDeck.code;
    void shareSessionCode(code).then((hint) => {
      if (mounted.current && latest.current.code === code) setNotice(hint);
    });
  }, [connected, liveDeck.code, liveDeck.shared, panel, touring]);
  const hasVotes = liveDeck.history.length > 0;
  useEffect(() => {
    if (touring || !liveDeck.shared || !connected || !hasVotes || panel) return;
    let active = true;
    getPushToken().then((token) => {
      if (active && token) send({ type: "push_token", pushToken: token });
    });
    return () => {
      active = false;
    };
  }, [connected, liveDeck.code, liveDeck.shared, hasVotes, panel, send, touring]);
  useEffect(() => {
    if (!loadingRound) return;
    const timer = setTimeout(() => setLoadingRound(false), 40000);
    return () => clearTimeout(timer);
  }, [loadingRound]);

  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (e) {
      sharePending.current = false;
      if (mounted.current)
        setNotice(
          e instanceof Error && !/^\d{3}:/.test(e.message)
            ? e.message
            : "Couldn’t open the room. Check the code or try again."
        );
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function switchDeck(next: DeckState) {
    setOutgoing(null);
    sharePending.current = false;
    setLost(false);
    setLoadingRound(false);
    setShowHint(true);
    setNotice("");
    setPanel(null);
    update(next);
  }
  async function loadPlaces(settings: DineSettings) {
    const found = await createDeck(await dineRequest(settings));
    if (!mounted.current) return;
    const previous = latest.current;
    if (previous.mode === "cook-in") personal.current["cook-in"] = previous;
    else room.leave();
    void rememberDineSettings(settings);
    switchDeck({
      mode: "dine-out",
      dishes: found.dishes,
      settings,
      code: found.code,
      session: found.session,
      history: [],
      dishIndex: 0,
      round: 1,
      shared: false,
    });
  }
  function selectMode(mode: SessionMode) {
    if (locked.current || mode === deck.mode) return;
    if (tour) {
      if (tour.step !== "mode") return;
      if (deck.shared) {
        advanceTour("round");
        setPanel("round");
      } else {
        const settings = { ...INITIAL_SETTINGS, meal: mealForTime(new Date()) };
        const next = personal.current[mode] ?? (mode === "cook-in" ? cookDeck() : {
          mode, dishes: shuffleDishes(settings.meal), settings, history: [], dishIndex: 0, round: 1, shared: false,
        });
        advanceTour("friends", next);
      }
      return;
    }
    if (deck.shared) {
      open("round");
      return;
    }
    const cached = personal.current[mode];
    if (cached || mode === "cook-in") {
      personal.current[deck.mode] = latest.current;
      switchDeck(cached ?? cookDeck());
    } else {
      void run(async () => loadPlaces(await preferredDineSettings()));
    }
  }
  const settings: DineSettings = {
    meal: deck.session?.meal ?? deck.settings?.meal ?? mealForTime(new Date()),
    deck: deck.session?.deck ?? deck.settings?.deck ?? INITIAL_SETTINGS.deck,
    radius: deck.session?.radius ?? deck.settings?.radius ?? INITIAL_SETTINGS.radius,
  };
  const noLocation = deck.session?.sample === "no-location";
  const canRefresh = !!deck.session?.sample || lost;
  function applySettings(next: DineSettings) {
    if (
      !canRefresh &&
      next.meal === settings.meal &&
      next.radius === settings.radius &&
      next.deck === settings.deck
    ) {
      open(null);
      return;
    }
    void run(() => loadPlaces(next));
  }
  async function invite() {
    if (deck.shared && connected && deck.code) {
      setNotice(await shareSessionCode(deck.code));
      return;
    }
    await run(async () => {
      sharePending.current = true;
      let current = latest.current;
      if (!current.code && current.mode === "cook-in") {
        const found = await createDeck({ mode: "cook-in", recipeOrder: current.dishes.map((d) => d.id) });
        if (!mounted.current) return;
        current = { ...latest.current, code: found.code, dishes: found.dishes, session: found.session };
      } else if (lost || !current.code) {
        throw new Error("This restaurant deck expired. Refresh nearby places to start another.");
      }
      setLost(false);
      saveVotes({ ...current, shared: true });
      if (!connected && current.code === deck.code) room.retry();
    });
  }
  function join(input: string) {
    const code = input.trim().toUpperCase();
    void run(async () => {
      await apiRequest("GET", "/api/sessions/" + encodeURIComponent(code));
      if (!mounted.current) return;
      if (latest.current.code === code) {
        update({ ...latest.current, shared: true });
        open(null);
        return;
      }
      personal.current[latest.current.mode] = latest.current;
      router.push({ pathname: "/swipe/[code]", params: { code } });
      open(null);
    });
  }
  function leaveGroup() {
    room.leave();
    sharePending.current = false;
    if (initialCode) {
      if (router.canGoBack()) router.back();
      else router.replace("/");
      return;
    }
    const previous = latest.current;
    if (previous.mode === "cook-in" && previous.dishes.length) {
      switchDeck({ ...previous, code: undefined, session: undefined, shared: false, round: 1 });
    } else {
      delete personal.current["dine-out"];
      switchDeck(personal.current["cook-in"] ?? cookDeck());
    }
  }
  function saveName() {
    const clean = nameRef.current.trim();
    if (clean === savedName.current) return;
    savedName.current = clean;
    void AsyncStorage.setItem("userName", clean).catch(() => {});
    if (deck.code) room.send({ type: "set_name", name: clean || "Guest" });
  }
  const byDish = settings.deck === "dishes";
  const cards = useMemo(() => groupCards(deck.dishes, byDish), [deck.dishes, byDish]);
  const voted = new Set(deck.history.map((s) => cardKey(s.dish, byDish)));
  const remaining = cards.filter((group) => !voted.has(cardKey(group[0], byDish)));
  const top = remaining[0];
  const dish = top?.[deck.dishIndex] ?? top?.[0];
  const likes = deck.history.filter((s) => s.vote === "like");
  const waitingForHost = deck.session?.status === "lobby";
  const canVote = !!dish && !waitingForHost && !loadingRound;
  const front = outgoing?.dishes ?? top;
  const behind = outgoing ? top : remaining[1];
  const cardKeyPrefix = (tour ? "practice-" : "") + (deck.mode === "dine-out" ? `${deck.code}-${deck.round}-` : `cook-${deck.round}-`);
  function vote(direction: SwipeVote, item: Dish) {
    const current = tour?.deck ?? latest.current;
    if (
      !canVote || outgoing || (tour && tour.step !== "swipe") ||
      panel ||
      !top || !top.includes(item) ||
      current.code !== deck.code ||
      current.round !== deck.round ||
      current.history.some((s) => cardKey(s.dish, byDish) === cardKey(item, byDish))
    )
      return false;
    // Count the vote immediately (including for an invite or reconnect) and
    // keep its card in front until the slide has actually finished.
    setOutgoing({ dishes: top, index: deck.dishIndex, key: cardKeyPrefix + top[0].id });
    const next = { ...current, history: [...current.history, { dish: item, vote: direction }], dishIndex: 0 };
    if (tour) {
      advanceTour("undo", next);
    } else {
      saveVotes(next);
      if (current.code) room.send({ type: "swipe", dishId: item.id, vote: direction, round: current.round });
    }
    void Haptics.impactAsync(direction === "like" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    return true;
  }
  function undo() {
    const current = tour?.deck ?? latest.current,
      last = current.history[current.history.length - 1];
    if (!last || loadingRound || outgoing || (tour && tour.step !== "undo")) return;
    const group = cards.find((c) => cardKey(c[0], byDish) === cardKey(last.dish, byDish));
    const restored = {
      ...current,
      history: current.history.slice(0, -1),
      dishIndex: Math.max(0, group?.findIndex((d) => d.id === last.dish.id) ?? 0),
    };
    if (tour) {
      advanceTour("mode", restored);
    } else {
      saveVotes(restored);
      if (current.code) room.send({ type: "undo", dishId: last.dish.id, round: current.round });
    }
    void Haptics.selectionAsync();
  }
  function newRound() {
    if (!deck.code) {
      switchDeck(cookDeck());
      return;
    }
    if (room.send({ type: "new_round" })) setLoadingRound(true);
    else room.retry();
  }
  function viewDetails(item: Dish) {
    setDetail(item);
    open("detail");
  }
  const members = deck.session?.members ?? [];
  const complete = !top && cards.length > 0;
  const everyoneDone = complete && members.every((m) => m.id === userId || (m.swiped ?? 0) >= cards.length);
  const canDeal = !deck.shared || (members.length >= 2 && everyoneDone);
  const mealLabel = settings.meal[0].toUpperCase() + settings.meal.slice(1);
  const radiusLabel = Math.round(settings.radius / 1609) + " mi";
  const cook = deck.mode === "cook-in";
  const groupLabel = deck.shared && members.length ? `Friends (${members.length})` : "Friends";
  const guide = focused && tour && <HowItWorks key={tour.step} step={tour.step} target={target}
    cook={cook} shared={deck.shared} onBack={tour.step !== "swipe" && !outgoing ? backInTour : undefined} onClose={closeTutorial} />;
  const practiceCard = !tour || tour.step === "swipe";
  const titles = {
    history: "Your swipes",
    friends: deck.shared ? "Your group" : "Swipe together",
    settings: "Nearby restaurants",
    round: "This round",
    likes: "Your likes",
    sample: "Sample restaurants",
    detail: detail?.name ?? "",
  };
  return (
    <SafeAreaView style={s.screen}>
      <View style={[s.inner, compact && s.compact]}>
        <View style={s.header}>
          <View style={s.tabs}>
            {(["cook-in", "dine-out"] as const).map((mode) => (
              <Pressable
                key={mode}
                ref={tour?.step === "mode" && mode !== deck.mode ? target : undefined}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === deck.mode }}
                disabled={busy || (!!tour && (tour.step !== "mode" || mode === deck.mode))}
                onPress={() => selectMode(mode)}
                style={[s.tab, mode === deck.mode && s.activeTab]}
              >
                <Text style={[s.tabText, mode === deck.mode && s.activeTabText]}>
                  {mode === "cook-in" ? "Cook In" : "Dine Out"}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            ref={tour?.step === "friends" ? target : undefined}
            accessibilityRole="button"
            accessibilityLabel={groupLabel}
            disabled={busy || (!!tour && tour.step !== "friends")}
            style={s.friends}
            onPress={() => {
              if (tour) advanceTour("invite");
              open("friends");
            }}
          >
            <Ionicons name="people-outline" size={19} color={Colors.accent} />
            <Text style={s.link}>{groupLabel}</Text>
          </Pressable>
        </View>
        {!cook && (
          <View pointerEvents={tour ? "none" : "auto"} aria-hidden={!!tour} style={s.context}>
            {deck.session?.sample || (tour && !deck.code) ? (
              <Pressable accessibilityRole="button" onPress={() => open("sample")} style={s.quiet}>
                <Text style={s.sample}>Sample places</Text>
              </Pressable>
            ) : (
              <Text style={s.hint}>Nearby places</Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mealLabel + " · " + radiusLabel}
              style={s.quiet}
              onPress={() => open(deck.shared ? "round" : "settings")}
            >
              <Ionicons name="options-outline" size={17} color={Colors.textSecondary} />
              <Text style={s.link}>
                {mealLabel} · {radiusLabel}
              </Text>
            </Pressable>
          </View>
        )}
        {busy && !panel && (
          <View style={s.status}>
            <ActivityIndicator color={Colors.accent} />
            <Text style={s.hint}>Finding places…</Text>
          </View>
        )}
        {!panel && !!notice && (
          <Text accessibilityLiveRegion="polite" style={sheetStyles.error}>
            {notice}
          </Text>
        )}
        {!tour && deck.code && !lost && (room.status === "offline" || room.status === "reconnecting") && (
          <View style={s.context}>
            <Text style={s.hint}>{room.status === "offline" ? "Room offline" : "Reconnecting…"}</Text>
            <Pressable accessibilityRole="button" style={s.quiet} onPress={room.retry}>
              <Text style={s.link}>Retry connection</Text>
            </Pressable>
          </View>
        )}
        <View ref={tour?.step === "swipe" ? target : undefined} collapsable={false} style={s.stack}
          pointerEvents={practiceCard ? "auto" : "none"} aria-hidden={!practiceCard} importantForAccessibility={practiceCard ? "auto" : "no-hide-descendants"}>
          {front && (canVote || outgoing) ? (
            <>
              {behind && (
                <DishCard
                  key={cardKeyPrefix + behind[0].id}
                  dishes={behind}
                  isTop={false}
                  reveal={reveal}
                />
              )}
              <DishCard
                key={outgoing?.key ?? cardKeyPrefix + front[0].id}
                ref={card}
                dishes={front}
                index={outgoing?.index ?? deck.dishIndex}
                onIndexChange={outgoing || tour ? undefined : (index) => {
                  update({ ...latest.current, dishIndex: index });
                  setShowHint(false);
                }}
                showHint={showHint}
                onSwipe={vote}
                onSwipeEnd={finished => setOutgoing(current => current?.dishes === finished ? null : current)}
                onViewRecipe={cook ? viewDetails : undefined}
                recipeDisabled={!!tour}
                isTop
                reveal={reveal}
              />
            </>
          ) : (
            <View style={s.empty}>
              {loadingRound || (!deck.dishes.length && !lost) ? (
                <>
                  <ActivityIndicator color={Colors.accent} />
                  <Text style={s.hint}>{loadingRound ? "Dealing the next round…" : "Joining the room…"}</Text>
                </>
              ) : waitingForHost ? (
                canStart ? (
                  <>
                    <Text style={s.title}>You’re the host</Text>
                    <Text style={s.hint}>Start once everyone has joined.</Text>
                    <SheetButton primary label="Start swiping" onPress={() => send({ type: "start" })} />
                  </>
                ) : (
                  <Text style={s.title}>Waiting for the host to start</Text>
                )
              ) : lost && !deck.dishes.length ? (
                <SheetButton label="Back to swiping" onPress={leaveGroup} />
              ) : (
                <>
                  <Text style={s.title}>
                    {deck.shared && members.length >= 2 && everyoneDone ? "No match yet" : "All caught up"}
                  </Text>
                  {deck.shared && (
                    <Text style={s.hint}>
                      {members.length < 2
                        ? "Your votes are ready for a friend to join."
                        : everyoneDone
                          ? "Everyone has finished this round."
                          : "Your votes are in. Waiting for the others to finish."}
                    </Text>
                  )}
                  {canDeal && !lost && (
                    <SheetButton
                      label={cook || deck.session?.sample ? "Shuffle again" : "Find new places"}
                      onPress={newRound}
                    />
                  )}
                  {deck.shared && members.length < 2 && (
                    <SheetButton label="Invite a friend" onPress={() => open("friends")} />
                  )}
                  {deck.history.length > 0 && (
                    <SheetButton label="Review your swipes" onPress={() => open("history")} />
                  )}
                </>
              )}
            </View>
          )}
        </View>
        <View style={s.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pass"
            disabled={!canVote || !!outgoing || !practiceCard}
            style={({ pressed }) => [s.vote, !canVote && s.dim, pressed && s.pressed]}
            onPress={() => card.current?.swipe("pass")}
          >
            <Ionicons name="close" size={23} color={Colors.red} />
            <Text style={s.actionText}>Pass</Text>
          </Pressable>
          <Pressable
            ref={tour?.step === "undo" ? target : undefined}
            accessibilityRole="button"
            accessibilityLabel="Undo last swipe"
            disabled={!count || loadingRound || !!outgoing || (!!tour && tour.step !== "undo")}
            style={({ pressed }) => [s.undo, (!count || loadingRound) && s.dim, pressed && s.pressed]}
            onPress={undo}
          >
            <Ionicons name="arrow-undo" size={20} color={Colors.accentGold} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Like"
            disabled={!canVote || !!outgoing || !practiceCard}
            style={({ pressed }) => [s.vote, !canVote && s.dim, pressed && s.pressed]}
            onPress={() => card.current?.swipe("like")}
          >
            <Ionicons name="heart" size={21} color={Colors.green} />
            <Text style={s.actionText}>Like</Text>
          </Pressable>
        </View>
        <View pointerEvents={tour ? "none" : "auto"} aria-hidden={!!tour} style={s.footer}>
          {deck.shared && cards.length > 0 && (
            <Text style={s.hint}>
              {deck.round > 1 ? "Round " + deck.round + " · " : ""}
              {count}/{cards.length} {cook ? "recipes" : byDish ? "dishes" : "places"}
            </Text>
          )}
          {likes.length ? (
            <Pressable accessibilityRole="button" style={s.quiet} onPress={() => open("likes")}>
              <Text style={s.link}>Your likes ({likes.length})</Text>
            </Pressable>
          ) : (
            !deck.shared && <Text style={s.hint}>Swipe left to pass, right to like.</Text>
          )}
        </View>
        {!panel && guide}
      </View>
      {panel && (
          <SwipeSheet title={titles[panel]} onClose={tour ? closeTutorial : () => open(null)} overlay={guide}>
            {!!notice && (
              <Text accessibilityLiveRegion="polite" style={sheetStyles.error}>
                {notice}
              </Text>
            )}
            {panel === "friends" && (
              <SessionPanel
                session={deck.session ?? null}
                shared={deck.shared}
                connected={tour ? true : connected}
                userId={userId}
                name={name}
                total={cards.length}
                count={count}
                busy={!tour && (busy || !userId)}
                tourTarget={tour?.step === "invite" ? target : undefined}
                onName={(value) => {
                  nameRef.current = value;
                  setName(value);
                }}
                onSaveName={saveName}
                onInvite={() => {
                  if (tour) closeTutorial();
                  else void invite();
                }}
                onJoin={join}
                onLeave={leaveGroup}
                onHelp={() => { open(null); startTour(); }}
                onHistory={() => open("history")}
                onClose={() => open(null)}
              />
            )}
            {panel === "settings" && (
              <DineOptions
                settings={settings}
                busy={busy}
                hasVotes={!!count}
                canRefresh={canRefresh}
                noLocation={noLocation}
                onApply={applySettings}
              />
            )}
            {panel === "round" && (
              <>
                <Text style={sheetStyles.label}>
                  {cook
                    ? "Cook In · Recipes"
                    : "Dine Out · " + mealLabel + " · " + radiusLabel + (byDish ? " · By dish" : " · By place")}
                </Text>
                <Text style={sheetStyles.secondary}>
                  Everyone in your group swipes on this deck. Leave the group to choose a different one.
                </Text>
                <SheetButton ref={tour?.step === "round" ? target : undefined} label="Keep swiping" onPress={() => {
                  if (tour) advanceTour("friends");
                  open(null);
                }} />
                <SheetButton label="Leave group" onPress={leaveGroup} disabled={!!tour} />
              </>
            )}
            {panel === "likes" &&
              likes.map(({ dish: liked }) => (
                <SheetButton key={liked.id} label={liked.name} onPress={() => viewDetails(liked)} />
              ))}
            {panel === "history" && <SwipeReview swipes={deck.history} />}
            {panel === "detail" &&
              detail &&
              (detail.mode === "cook-in" ? (
                <RecipeDetails dish={detail} />
              ) : (
                <>
                  <Text style={sheetStyles.label}>{detail.restaurant}</Text>
                  <Text style={sheetStyles.secondary}>{detail.description}</Text>
                  {deck.session?.sample ? (
                    <SampleRoomNotice reason={deck.session.sample} isHost={deck.session.hostId === userId} />
                  ) : (
                    <MatchActions dish={detail} />
                  )}
                </>
              ))}
            {panel === "sample" && (
              <>
                <SampleRoomNotice
                  reason={deck.session?.sample}
                  isHost={!deck.shared || deck.session?.hostId === userId}
                />
                {!deck.shared && <SheetButton label="Nearby settings" onPress={() => open("settings")} />}
              </>
            )}
          </SwipeSheet>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 9, overflow: "hidden" },
  compact: { gap: 3, paddingTop: 2 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  tabs: { flexDirection: "row", backgroundColor: Colors.surface, padding: 3, borderRadius: 15 },
  tab: {
    paddingHorizontal: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  activeTab: { backgroundColor: Colors.text },
  tabText: { color: Colors.textSecondary, fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  activeTabText: { color: Colors.background },
  friends: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  link: { color: Colors.accent, fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  hint: { color: Colors.textSecondary, fontSize: 13, fontFamily: "Poppins_400Regular", textAlign: "center" },
  sample: { color: Colors.accentGold, fontFamily: "Poppins_500Medium", fontSize: 13 },
  context: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  quiet: {
    flexDirection: "row",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    gap: 5,
  },
  stack: { flex: 1, position: "relative", minHeight: 0 },
  empty: { flex: 1, gap: 12, alignItems: "center", justifyContent: "center", padding: 12 },
  title: { color: Colors.text, fontSize: 20, fontFamily: "Poppins_700Bold", textAlign: "center" },
  status: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 },
  pressed: { transform: [{ scale: 0.94 }] },
  vote: {
    flex: 1,
    maxWidth: 162,
    minHeight: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionText: { color: Colors.text, fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  undo: {
    minWidth: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  dim: { opacity: 0.4 },
  footer: { minHeight: 44, flexDirection: "row", justifyContent: "space-evenly", alignItems: "center", gap: 8 },
});
