import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { vendorApi } from "@/services/api";
import type { VendorStats, CustomerAlert, PendingItem } from "@/types";

export default function VendorHomeScreen() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [alerts, setAlerts] = useState<CustomerAlert[]>([]);
  const [scheduledToday, setScheduledToday] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsRes, visitsRes] = await Promise.all([
        vendorApi.getStats(),
        vendorApi.getMyVisits(),
      ]);
      setStats(statsRes.data);
      setAlerts(visitsRes.data.alerts);

      const today = new Date();
      const todayPending = visitsRes.data.pending.filter((sv) => {
        const d = new Date(sv.scheduledFor);
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
        );
      });
      setScheduledToday(todayPending);
    } catch (err: any) {
      console.error("Error cargando home:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      {/* Saludo */}
      <View style={styles.greetingBox}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.userName}>{user?.name ?? "Vendedor"} 👋</Text>
      </View>

      {/* Stats cards */}
      {stats && (
        <View style={styles.statsRow}>
          <StatCard label="Asignados" value={stats.assignedCustomers} color="#1e40af" />
          <StatCard label="Visitados hoy" value={stats.visitedToday} color="#16a34a" />
          <StatCard label="Alertas" value={stats.pendingAlerts} color="#dc2626" />
        </View>
      )}

      {/* Alertas */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Alertas — clientes sin visitar</Text>
          {alerts.slice(0, 5).map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.alertCard}
              onPress={() => router.push(`/(vendor)/visit/${c.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.alertRow}>
                <Text style={styles.alertName} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.alertDays}>
                  {c.daysSinceVisit != null ? `${c.daysSinceVisit}d` : "Nunca"}
                </Text>
              </View>
              {c.address && (
                <Text style={styles.alertAddress} numberOfLines={1}>
                  {c.address}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Programadas hoy */}
      {scheduledToday.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Programadas hoy</Text>
          {scheduledToday.map((sv) => (
            <TouchableOpacity
              key={sv.id}
              style={styles.scheduledCard}
              onPress={() => router.push(`/(vendor)/visit/${sv.customer.id}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.scheduledName} numberOfLines={1}>
                {sv.customer.name}
              </Text>
              <Text style={styles.scheduledTime}>
                {new Date(sv.scheduledFor).toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Botones rápidos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => router.push("/(vendor)/clientes")}
          activeOpacity={0.8}
        >
          <Text style={styles.quickBtnText}>📍 Ver todos mis clientes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, styles.quickBtnSecondary]}
          onPress={() => router.push("/(vendor)/my-visits")}
          activeOpacity={0.8}
        >
          <Text style={[styles.quickBtnText, styles.quickBtnTextSecondary]}>
            📋 Mis visitas
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  greetingBox: { marginBottom: 4 },
  greeting: { fontSize: 16, color: "#6b7280" },
  userName: { fontSize: 22, fontWeight: "800", color: "#111827" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
  },
  statValue: { fontSize: 26, fontWeight: "800" },
  statLabel: { fontSize: 11, color: "#6b7280", marginTop: 2, textAlign: "center" },
  section: { gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#374151" },
  alertCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
  },
  alertRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertName: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1 },
  alertDays: { fontSize: 12, fontWeight: "700", color: "#dc2626", marginLeft: 8 },
  alertAddress: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  scheduledCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: "#1e40af",
  },
  scheduledName: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1 },
  scheduledTime: { fontSize: 13, color: "#1e40af", fontWeight: "600" },
  quickBtn: {
    backgroundColor: "#1e40af",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  quickBtnSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#1e40af",
  },
  quickBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  quickBtnTextSecondary: { color: "#1e40af" },
});
