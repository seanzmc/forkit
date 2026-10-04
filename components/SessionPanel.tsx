import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { SwipeReview } from "@/components/SwipeReview";
import { shareSessionCode } from "@/lib/share-session";
import type { ReviewedSwipe } from "@/lib/swipe-review";

// Opened from the member bubbles on the swipe screen: the room code (to invite
// more people mid-game), how far each member has got, and your own swipes.
// Other members' votes stay hidden so nobody is nudged toward the group's pick.
export function SessionPanel({
  visible,
  onClose,
  code,
  members,
  hostId,
  myId,
  progress,
  total,
  swipes,
}: {
  visible: boolean;
  onClose: () => void;
  code: string;
  members: { id: string; name: string }[];
  hostId?: string;
  myId: string;
  progress: Record<string, number>;
  total: number;
  swipes: ReviewedSwipe[];
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Session</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close" style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => shareSessionCode(code)} style={styles.codeCard}>
            <Text style={styles.codeLabel}>SESSION CODE</Text>
            <Text style={styles.code}>{code.toUpperCase()}</Text>
            <View style={styles.shareRow}>
              <Ionicons name="share-outline" size={16} color={Colors.accent} />
              <Text style={styles.shareText}>Share with your group</Text>
            </View>
          </Pressable>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Members ({members.length})</Text>
            {members.map((m) => {
              const done = Math.min(progress[m.id] ?? 0, total);
              return (
                <View key={m.id} style={styles.memberRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLetter}>{m.name[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {m.name}
                      {m.id === myId ? " (You)" : ""}
                      {m.id === hostId ? " · Host" : ""}
                    </Text>
                    <View style={styles.bar}>
                      <View
                        style={[styles.barFill, { width: `${total ? (done / total) * 100 : 0}%` }]}
                      />
                    </View>
                  </View>
                  <Text style={styles.count}>
                    {done}/{total}
                  </Text>
                </View>
              );
            })}
          </View>

          {swipes.length > 0 ? (
            <SwipeReview swipes={swipes} />
          ) : (
            <Text style={styles.empty}>{"You haven't swiped yet."}</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    color: Colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 20,
  },
  codeCard: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 20,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.25)",
  },
  codeLabel: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: Colors.textSecondary,
    letterSpacing: 3,
  },
  code: {
    fontSize: 40,
    fontFamily: "Poppins_700Bold",
    color: Colors.accent,
    letterSpacing: 8,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shareText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: Colors.accent,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,107,53,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    color: Colors.accent,
  },
  memberInfo: {
    flex: 1,
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: Colors.text,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceElevated,
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  count: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: Colors.textSecondary,
  },
  empty: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
});
