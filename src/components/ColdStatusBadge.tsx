import { View, Text, StyleSheet } from "react-native";
import type { ColdStatus } from "@/types";

const CONFIG: Record<ColdStatus, { textColor: string; bgColor: string; label: string }> = {
  HOT:    { textColor: "#166534", bgColor: "#dcfce7", label: "Al día" },
  WARM:   { textColor: "#854d0e", bgColor: "#fef9c3", label: "Tibia" },
  COLD:   { textColor: "#9a3412", bgColor: "#ffedd5", label: "Fría" },
  FROZEN: { textColor: "#991b1b", bgColor: "#fee2e2", label: "Sin visita" },
};

interface Props {
  status: ColdStatus;
  days: number | null;
}

export function ColdStatusBadge({ status, days }: Props) {
  const cfg = CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bgColor }]}>
      <Text style={[styles.text, { color: cfg.textColor }]}>
        {cfg.label}
        {days != null ? ` · ${days}d` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
});
