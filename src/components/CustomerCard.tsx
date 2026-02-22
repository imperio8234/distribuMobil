import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Customer } from "@/types";
import { ColdStatusBadge } from "./ColdStatusBadge";

interface Props {
  customer: Customer;
  onPress: () => void;
}

export function CustomerCard({ customer, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {customer.name}
          </Text>
          {customer.address && (
            <Text style={styles.address} numberOfLines={1}>
              {customer.address}
            </Text>
          )}
          {customer.phone && (
            <Text style={styles.phone}>{customer.phone}</Text>
          )}
        </View>
        <ColdStatusBadge
          status={customer.coldStatus}
          days={customer.daysSinceVisit}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "700", color: "#111827" },
  address: { fontSize: 12, color: "#6b7280" },
  phone: { fontSize: 12, color: "#4b5563" },
});
