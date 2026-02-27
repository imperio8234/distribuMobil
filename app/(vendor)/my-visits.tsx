import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { vendorApi } from "@/services/api";
import type { MyVisitsData, CompletedVisit, PendingItem, CustomerAlert } from "@/types";

type Tab = "today" | "pending" | "alerts";

const RESULT_LABELS: Record<string, string> = {
  ORDER_TAKEN: "Pedido tomado",
  NOT_HOME: "No estaba",
  REFUSED: "No quiso",
};

const RESULT_COLORS: Record<string, string> = {
  ORDER_TAKEN: "#16a34a",
  NOT_HOME: "#d97706",
  REFUSED: "#dc2626",
};

export default function MyVisitsScreen() {
  const [tab, setTab] = useState<Tab>("today");
  const [data, setData] = useState<MyVisitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await vendorApi.getMyVisits();
      setData(res.data);
    } catch (err: any) {
      console.error("Error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      // Volver a cargar las listas cuando la pantalla se enfoca de nuevo
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  const alertCount = data?.alerts.length ?? 0;

  return (
    <View style={styles.container}>
      {/* Tabs internos */}
      <View style={styles.tabBar}>
        {(["today", "pending", "alerts"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "today"
                ? "Hoy"
                : t === "pending"
                ? "Pendientes"
                : `Alertas${alertCount > 0 ? ` (${alertCount})` : ""}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab: Hoy */}
      {tab === "today" && (
        <FlatList
          data={data?.today ?? []}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          renderItem={({ item }) => <TodayVisitCard visit={item} />}
          ListEmptyComponent={<EmptyState text="No hay visitas completadas hoy." />}
        />
      )}

      {/* Tab: Pendientes */}
      {tab === "pending" && (
        <FlatList
          data={data?.pending ?? []}
          keyExtractor={(sv) => sv.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.pendingCard}
              onPress={() => router.push(`/(vendor)/visit/${item.customer.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.pendingRow}>
                <Text style={styles.pendingName} numberOfLines={1}>
                  {item.customer.name}
                </Text>
                <Text style={styles.pendingDate}>
                  {new Date(item.scheduledFor).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </View>
              {item.customer.address && (
                <Text style={styles.pendingAddr} numberOfLines={1}>
                  {item.customer.address}
                </Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<EmptyState text="No hay visitas pendientes programadas." />}
        />
      )}

      {/* Tab: Alertas */}
      {tab === "alerts" && (
        <FlatList
          data={data?.alerts ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.alertCard}>
              <View style={styles.alertRow}>
                <Text style={styles.alertName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.alertDays}>
                  {item.daysSinceVisit != null
                    ? `${item.daysSinceVisit} días`
                    : "Sin visitas"}
                </Text>
              </View>
              {item.address && (
                <Text style={styles.alertAddr} numberOfLines={1}>
                  {item.address}
                </Text>
              )}
              <TouchableOpacity
                style={styles.visitNowBtn}
                onPress={() => router.push(`/(vendor)/visit/${item.id}`)}
              >
                <Text style={styles.visitNowText}>Visitar ahora →</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<EmptyState text="Sin clientes en alerta. ¡Buen trabajo!" />}
        />
      )}
    </View>
  );
}

function TodayVisitCard({ visit }: { visit: CompletedVisit }) {
  const color = visit.result ? (RESULT_COLORS[visit.result] ?? "#6b7280") : "#6b7280";
  const label = visit.result ? (RESULT_LABELS[visit.result] ?? visit.result) : "En progreso";

  return (
    <View style={styles.todayCard}>
      <View style={styles.todayRow}>
        <Text style={styles.todayName} numberOfLines={1}>
          {visit.customer.name}
        </Text>
        <View style={[styles.resultBadge, { backgroundColor: color + "20" }]}>
          <Text style={[styles.resultText, { color }]}>{label}</Text>
        </View>
      </View>
      {visit.orderAmount != null && (
        <Text style={styles.todayAmount}>
          {new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
          }).format(visit.orderAmount)}
        </Text>
      )}
      {visit.checkOutAt && (
        <Text style={styles.todayTime}>
          {new Date(visit.checkOutAt).toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      )}
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#1e40af" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#9ca3af" },
  tabTextActive: { color: "#1e40af" },
  listContent: { padding: 16, gap: 10, paddingBottom: 40 },
  todayCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  todayRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  todayName: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  resultBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 8 },
  resultText: { fontSize: 11, fontWeight: "700" },
  todayAmount: { fontSize: 14, color: "#16a34a", fontWeight: "700", marginTop: 4 },
  todayTime: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  pendingCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#1e40af",
  },
  pendingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pendingName: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1 },
  pendingDate: { fontSize: 13, color: "#1e40af", fontWeight: "600" },
  pendingAddr: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  alertCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
  },
  alertRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertName: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1 },
  alertDays: { fontSize: 12, color: "#dc2626", fontWeight: "700", marginLeft: 8 },
  alertAddr: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  visitNowBtn: { marginTop: 10, alignSelf: "flex-end" },
  visitNowText: { color: "#dc2626", fontWeight: "700", fontSize: 13 },
  emptyState: { flex: 1, alignItems: "center", paddingTop: 60 },
  emptyText: { color: "#9ca3af", fontSize: 14, textAlign: "center" },
});
