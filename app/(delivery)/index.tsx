import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import { deliveriesApi } from "@/services/api";
import type { DeliveryOrder } from "@/types";

// ── Colores por estado de orden ───────────────────────────────────
const PIN_COLOR: Record<string, string> = {
  PENDING:     "#dc2626", // rojo
  IN_DELIVERY: "#f59e0b", // naranja
  DELIVERED:   "#16a34a", // verde
  CANCELLED:   "#9ca3af", // gris
};

const STATUS_LABEL: Record<string, string> = {
  PENDING:     "Pendiente",
  IN_DELIVERY: "En camino",
  DELIVERED:   "Entregado",
  CANCELLED:   "Cancelado",
};

const STATUS_BG: Record<string, string> = {
  PENDING:     "#fef3c7",
  IN_DELIVERY: "#dbeafe",
  DELIVERED:   "#dcfce7",
  CANCELLED:   "#f3f4f6",
};

const STATUS_TEXT: Record<string, string> = {
  PENDING:     "#92400e",
  IN_DELIVERY: "#1e3a8a",
  DELIVERED:   "#14532d",
  CANCELLED:   "#6b7280",
};

export default function DeliveryRouteScreen() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const mapRef = useRef<MapView>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await deliveriesApi.listToday();
      setOrders(data);
    } catch (err: any) {
      console.error("Error cargando entregas:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Región inicial del mapa: centrada en el primer pedido pendiente
  const mapRegion = (): Region => {
    const pending = orders.find(
      (o) => o.orderStatus === "PENDING" || o.orderStatus === "IN_DELIVERY"
    ) ?? orders[0];
    if (pending) {
      return {
        latitude: pending.customer.lat,
        longitude: pending.customer.lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
    }
    return { latitude: 4.711, longitude: -74.0721, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  };

  // ── Acciones ───────────────────────────────────────────────────
  function openMaps(lat: number, lng: number) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "No se pudo abrir Google Maps")
    );
  }

  async function handleStart(order: DeliveryOrder) {
    try {
      await deliveriesApi.markStarted(order.orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === order.orderId ? { ...o, orderStatus: "IN_DELIVERY" } : o
        )
      );
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "No se pudo actualizar el estado");
    }
  }

  async function handleDelivered(order: DeliveryOrder) {
    Alert.alert(
      "Confirmar entrega",
      `¿Entregaste el pedido a "${order.customer.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, entregado",
          onPress: async () => {
            try {
              await deliveriesApi.markDelivered(order.orderId);
              setOrders((prev) =>
                prev.map((o) =>
                  o.orderId === order.orderId ? { ...o, orderStatus: "DELIVERED" } : o
                )
              );
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  }

  async function handleFailed(order: DeliveryOrder) {
    Alert.alert(
      "No se pudo entregar",
      `¿Por qué no se entregó el pedido a "${order.customer.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cliente no estaba",
          onPress: async () => {
            try {
              await deliveriesApi.markFailed(order.orderId, "Cliente no estaba");
              setOrders((prev) =>
                prev.map((o) =>
                  o.orderId === order.orderId ? { ...o, orderStatus: "CANCELLED" } : o
                )
              );
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
        {
          text: "Dirección incorrecta",
          onPress: async () => {
            try {
              await deliveriesApi.markFailed(order.orderId, "Dirección incorrecta");
              setOrders((prev) =>
                prev.map((o) =>
                  o.orderId === order.orderId ? { ...o, orderStatus: "CANCELLED" } : o
                )
              );
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
        {
          text: "Cerrado / no atendió",
          onPress: async () => {
            try {
              await deliveriesApi.markFailed(order.orderId, "Cerrado / no atendió");
              setOrders((prev) =>
                prev.map((o) =>
                  o.orderId === order.orderId ? { ...o, orderStatus: "CANCELLED" } : o
                )
              );
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  }

  // ── Contadores para el header ───────────────────────────────────
  const delivered  = orders.filter((o) => o.orderStatus === "DELIVERED").length;
  const pending    = orders.filter((o) => o.orderStatus === "PENDING").length;
  const inDelivery = orders.filter((o) => o.orderStatus === "IN_DELIVERY").length;
  const total      = orders.length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header con stats + toggle de vista */}
      <View style={styles.header}>
        <View style={styles.stats}>
          <StatPill label="Total"      value={total}      color="#6b7280" />
          <StatPill label="Pendientes" value={pending}    color="#dc2626" />
          <StatPill label="En camino"  value={inDelivery} color="#f59e0b" />
          <StatPill label="Entregados" value={delivered}  color="#16a34a" />
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, view === "list" && styles.toggleActive]}
            onPress={() => setView("list")}
          >
            <Text style={[styles.toggleText, view === "list" && styles.toggleTextActive]}>
              Lista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, view === "map" && styles.toggleActive]}
            onPress={() => setView("map")}
          >
            <Text style={[styles.toggleText, view === "map" && styles.toggleTextActive]}>
              Mapa
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vista MAPA */}
      {view === "map" && (
        <View style={styles.mapContainer}>
          {orders.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>Sin entregas hoy</Text>
            </View>
          ) : (
            <>
              <MapView ref={mapRef} style={styles.map} initialRegion={mapRegion()}>
                {orders.map((order, idx) => (
                  <Marker
                    key={order.orderId}
                    coordinate={{
                      latitude: order.customer.lat,
                      longitude: order.customer.lng,
                    }}
                    pinColor={PIN_COLOR[order.orderStatus] ?? "#dc2626"}
                    title={order.customer.name}
                    description={`$${order.amount.toLocaleString("es-CO")} · ${STATUS_LABEL[order.orderStatus]}`}
                  >
                    <Callout tooltip>
                      <View style={styles.callout}>
                        <View style={styles.calloutStop}>
                          <Text style={styles.calloutStopText}>{idx + 1}</Text>
                        </View>
                        <View style={styles.calloutBody}>
                          <Text style={styles.calloutName} numberOfLines={1}>
                            {order.customer.name}
                          </Text>
                          <Text style={styles.calloutAddress} numberOfLines={1}>
                            {order.customer.address ?? "Sin dirección"}
                          </Text>
                          <Text style={styles.calloutAmount}>
                            ${order.amount.toLocaleString("es-CO")} COP
                          </Text>
                          <View
                            style={[
                              styles.calloutBadge,
                              { backgroundColor: STATUS_BG[order.orderStatus] },
                            ]}
                          >
                            <Text style={[styles.calloutBadgeText, { color: STATUS_TEXT[order.orderStatus] }]}>
                              {STATUS_LABEL[order.orderStatus]}
                            </Text>
                          </View>
                          {/* Botones de acción en el callout */}
                          <View style={styles.calloutActions}>
                            <TouchableOpacity
                              style={styles.calloutNavBtn}
                              onPress={() =>
                                openMaps(order.customer.lat, order.customer.lng)
                              }
                            >
                              <Text style={styles.calloutNavText}>Navegar</Text>
                            </TouchableOpacity>
                            {order.orderStatus === "PENDING" && (
                              <TouchableOpacity
                                style={styles.calloutStartBtn}
                                onPress={() => handleStart(order)}
                              >
                                <Text style={styles.calloutActionText}>En camino</Text>
                              </TouchableOpacity>
                            )}
                            {order.orderStatus === "IN_DELIVERY" && (
                              <>
                                <TouchableOpacity
                                  style={styles.calloutDeliveredBtn}
                                  onPress={() => handleDelivered(order)}
                                >
                                  <Text style={styles.calloutActionText}>Entregado</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.calloutFailedBtn}
                                  onPress={() => handleFailed(order)}
                                >
                                  <Text style={styles.calloutActionText}>No pudo</Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        </View>
                      </View>
                    </Callout>
                  </Marker>
                ))}
              </MapView>

              {/* Leyenda */}
              <View style={styles.legend}>
                <LegendDot color="#dc2626" label="Pendiente" />
                <LegendDot color="#f59e0b" label="En camino" />
                <LegendDot color="#16a34a" label="Entregado" />
              </View>
            </>
          )}
        </View>
      )}

      {/* Vista LISTA */}
      {view === "list" && (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={orders}
          keyExtractor={(o) => o.orderId}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyText}>Sin entregas programadas para hoy</Text>
            </View>
          }
          renderItem={({ item: order, index }) => {
            const isDelivered  = order.orderStatus === "DELIVERED";
            const isInDelivery = order.orderStatus === "IN_DELIVERY";
            const isPending    = order.orderStatus === "PENDING";
            const isCancelled  = order.orderStatus === "CANCELLED";

            return (
              <View
                style={[
                  styles.card,
                  isDelivered && styles.cardDelivered,
                  isCancelled && styles.cardCancelled,
                ]}
              >
                {/* Header de la tarjeta */}
                <View style={styles.cardHeader}>
                  <View style={[styles.stopBadge, { backgroundColor: PIN_COLOR[order.orderStatus] }]}>
                    <Text style={styles.stopNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.customerName}>{order.customer.name}</Text>
                    <Text style={styles.address}>
                      {order.customer.address ?? "Sin dirección"}
                    </Text>
                    <Text style={styles.amount}>
                      ${order.amount.toLocaleString("es-CO")} COP
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[order.orderStatus] }]}>
                    <Text style={[styles.statusBadgeText, { color: STATUS_TEXT[order.orderStatus] }]}>
                      {STATUS_LABEL[order.orderStatus]}
                    </Text>
                  </View>
                </View>

                {/* Botones según estado */}
                {!isDelivered && !isCancelled && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.mapsBtn}
                      onPress={() => openMaps(order.customer.lat, order.customer.lng)}
                    >
                      <Text style={styles.mapsBtnText}>Navegar</Text>
                    </TouchableOpacity>

                    {isPending && (
                      <TouchableOpacity
                        style={styles.startBtn}
                        onPress={() => handleStart(order)}
                      >
                        <Text style={styles.startBtnText}>En camino 🚚</Text>
                      </TouchableOpacity>
                    )}

                    {isInDelivery && (
                      <>
                        <TouchableOpacity
                          style={styles.deliveredBtn}
                          onPress={() => handleDelivered(order)}
                        >
                          <Text style={styles.deliveredBtnText}>Entregado ✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.failedBtn}
                          onPress={() => handleFailed(order)}
                        >
                          <Text style={styles.failedBtnText}>No pudo</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}

                {/* Estado final */}
                {isDelivered && (
                  <Text style={styles.doneText}>✓ Entregado exitosamente</Text>
                )}
                {isCancelled && (
                  <Text style={styles.failedText}>✗ No se pudo entregar</Text>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

// ── Componentes pequeños ─────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 8,
  },
  stats: { flexDirection: "row", gap: 8, justifyContent: "space-around" },
  statPill: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 10, color: "#9ca3af", fontWeight: "600" },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 3,
  },
  toggleBtn: { flex: 1, paddingVertical: 6, alignItems: "center", borderRadius: 6 },
  toggleActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: 13, fontWeight: "600", color: "#9ca3af" },
  toggleTextActive: { color: "#111827" },

  // Mapa
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  legend: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    padding: 10,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: "#374151", fontWeight: "500" },

  // Callout del mapa
  callout: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    gap: 8,
    width: 220,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutStop: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1e40af",
    justifyContent: "center",
    alignItems: "center",
  },
  calloutStopText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  calloutBody: { flex: 1, gap: 3 },
  calloutName: { fontWeight: "700", fontSize: 13, color: "#111827" },
  calloutAddress: { fontSize: 11, color: "#6b7280" },
  calloutAmount: { fontSize: 12, color: "#1e40af", fontWeight: "600" },
  calloutBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
  calloutBadgeText: { fontSize: 10, fontWeight: "700" },
  calloutActions: { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
  calloutNavBtn: { backgroundColor: "#eff6ff", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  calloutNavText: { color: "#1e40af", fontWeight: "700", fontSize: 11 },
  calloutStartBtn: { backgroundColor: "#fef3c7", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  calloutDeliveredBtn: { backgroundColor: "#dcfce7", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  calloutFailedBtn: { backgroundColor: "#fee2e2", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  calloutActionText: { color: "#111827", fontWeight: "700", fontSize: 11 },

  // Lista
  list: { flex: 1 },
  listContent: { padding: 16, gap: 10, paddingBottom: 40 },
  emptyBox: { alignItems: "center", padding: 48, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: "#6b7280", fontSize: 15, textAlign: "center" },

  // Tarjetas de lista
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  cardDelivered: { opacity: 0.75 },
  cardCancelled: { opacity: 0.65 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stopBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  stopNumber: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cardInfo: { flex: 1, gap: 2 },
  customerName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  address: { fontSize: 12, color: "#6b7280" },
  amount: { fontSize: 13, color: "#1e40af", fontWeight: "600" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },

  // Botones de acción en lista
  actions: { flexDirection: "row", gap: 6 },
  mapsBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#1e40af",
    borderRadius: 8,
    padding: 9,
    alignItems: "center",
  },
  mapsBtnText: { color: "#1e40af", fontWeight: "600", fontSize: 12 },
  startBtn: {
    flex: 2,
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    padding: 9,
    alignItems: "center",
  },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  deliveredBtn: {
    flex: 2,
    backgroundColor: "#16a34a",
    borderRadius: 8,
    padding: 9,
    alignItems: "center",
  },
  deliveredBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  failedBtn: {
    flex: 1,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    padding: 9,
    alignItems: "center",
  },
  failedBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  doneText: { fontSize: 12, color: "#16a34a", fontWeight: "600", textAlign: "center" },
  failedText: { fontSize: 12, color: "#dc2626", fontWeight: "600", textAlign: "center" },
});
