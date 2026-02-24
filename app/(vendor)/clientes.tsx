import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { router } from "expo-router";
import { customersApi } from "@/services/api";
import type { Customer } from "@/types";
import { CustomerCard } from "@/components/CustomerCard";
import { useLocation } from "@/hooks/useLocation";

const PIN_COLORS: Record<string, string> = {
  HOT: "#22c55e",
  WARM: "#eab308",
  COLD: "#f97316",
  FROZEN: "#ef4444",
};

// Coordenadas por defecto: Bogotá, Colombia
const DEFAULT_REGION = {
  latitude: 4.711,
  longitude: -74.0721,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function VendorClientesScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Planificación de ruta
  const [routeMode, setRouteMode] = useState(false);
  const [routeOrder, setRouteOrder] = useState<Customer[]>([]);

  // Ejecución de ruta
  const [routeActive, setRouteActive] = useState(false);
  const [routeStep, setRouteStep] = useState(0);

  const mapRef = useRef<MapView>(null);
  const { location, getLocation, startLocationTracking, stopLocationTracking } = useLocation();

  const load = useCallback(async () => {
    try {
      const { data } = await customersApi.list();
      setCustomers(data);
    } catch (err: any) {
      console.error("Error cargando clientes:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    getLocation();
  }, [load]);

  function handleMyLocation() {
    if (location) {
      mapRef.current?.animateToRegion(
        {
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    } else {
      getLocation();
    }
  }

  function toggleRouteCustomer(customer: Customer) {
    setRouteOrder((prev) => {
      const idx = prev.findIndex((c) => c.id === customer.id);
      if (idx >= 0) return prev.filter((c) => c.id !== customer.id);
      return [...prev, customer];
    });
  }

  function cancelRoutePlanning() {
    setRouteMode(false);
    setRouteOrder([]);
  }

  function startRoute() {
    if (routeOrder.length === 0) {
      Alert.alert("Sin clientes", "Selecciona al menos un cliente para la ruta.");
      return;
    }
    setRouteStep(0);
    setRouteActive(true);
    startLocationTracking(); // Inicia reporte de ubicación cada 30s

    // Centrar mapa en el primer cliente
    const first = routeOrder[0];
    mapRef.current?.animateToRegion(
      {
        latitude: first.lat,
        longitude: first.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      500
    );
  }

  function visitCurrentCustomer() {
    const customer = routeOrder[routeStep];
    router.push(`/(vendor)/visit/${customer.id}`);
  }

  function nextStop() {
    if (routeStep < routeOrder.length - 1) {
      const next = routeOrder[routeStep + 1];
      setRouteStep((s) => s + 1);
      // Centrar mapa en la siguiente parada
      mapRef.current?.animateToRegion(
        {
          latitude: next.lat,
          longitude: next.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500
      );
    } else {
      Alert.alert(
        "Ruta completada",
        "¡Terminaste todas las paradas de la ruta!",
        [{ text: "OK", onPress: finishRoute }]
      );
    }
  }

  function finishRoute() {
    stopLocationTracking(); // Detiene el reporte de ubicación
    setRouteActive(false);
    setRouteMode(false);
    setRouteOrder([]);
    setRouteStep(0);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  const mapRegion =
    customers.length > 0
      ? {
          latitude: customers[0].lat,
          longitude: customers[0].lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : DEFAULT_REGION;

  const currentCustomer = routeActive ? routeOrder[routeStep] : null;

  return (
    <View style={styles.container}>
      {/* Mapa */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          region={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {customers.map((c) => {
            // Color del pin según estado de ruta
            let pinColor = PIN_COLORS[c.coldStatus];
            if (routeActive) {
              const idx = routeOrder.findIndex((r) => r.id === c.id);
              if (idx >= 0) {
                if (idx < routeStep) pinColor = "#9ca3af";         // completada
                else if (idx === routeStep) pinColor = "#1e40af";  // actual
                else pinColor = "#93c5fd";                          // pendiente en ruta
              }
            } else if (routeMode) {
              const idx = routeOrder.findIndex((r) => r.id === c.id);
              if (idx >= 0) pinColor = "#1e40af";
            }

            return (
              <Marker
                key={c.id}
                coordinate={{ latitude: c.lat, longitude: c.lng }}
                title={c.name}
                description={
                  c.daysSinceVisit != null
                    ? `${c.daysSinceVisit} días sin visita`
                    : "Sin visitas registradas"
                }
                pinColor={pinColor}
                onCalloutPress={() => {
                  if (routeMode && !routeActive) {
                    toggleRouteCustomer(c);
                  } else if (!routeActive) {
                    router.push(`/(vendor)/visit/${c.id}`);
                  }
                }}
              />
            );
          })}

          {/* Polilínea entre paradas de la ruta */}
          {(routeMode || routeActive) && routeOrder.length > 1 && (
            <Polyline
              coordinates={routeOrder.map((c) => ({
                latitude: c.lat,
                longitude: c.lng,
              }))}
              strokeColor="#3b82f6"
              strokeWidth={3}
              lineDashPattern={routeActive ? undefined : [8, 4]}
            />
          )}
        </MapView>

        {/* Botón Mi ubicación */}
        <TouchableOpacity style={styles.myLocationBtn} onPress={handleMyLocation}>
          <Text style={styles.myLocationIcon}>📍</Text>
        </TouchableOpacity>

        {/* Botón Armar / Cancelar ruta (solo en fase de planificación) */}
        {!routeActive && (
          <TouchableOpacity
            style={[styles.routeModeBtn, routeMode && styles.routeModeBtnActive]}
            onPress={() => {
              if (routeMode) cancelRoutePlanning();
              else setRouteMode(true);
            }}
          >
            <Text
              style={[
                styles.routeModeBtnText,
                routeMode && styles.routeModeBtnTextActive,
              ]}
            >
              {routeMode ? "Cancelar" : "Armar ruta"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Panel de planificación ── */}
      {routeMode && !routeActive && (
        <View style={styles.routePanel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.routeChipsContent}
          >
            {routeOrder.length === 0 ? (
              <Text style={styles.routeHint}>
                Toca clientes para agregar a la ruta
              </Text>
            ) : (
              routeOrder.map((c, idx) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.routeChip}
                  onPress={() => toggleRouteCustomer(c)}
                >
                  <View style={styles.routeChipBadge}>
                    <Text style={styles.routeChipBadgeText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.routeChipName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.routeChipRemove}>✕</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          {routeOrder.length > 0 && (
            <TouchableOpacity style={styles.startRouteBtn} onPress={startRoute}>
              <Text style={styles.startRouteBtnText}>
                ▶ Iniciar ruta ({routeOrder.length} paradas)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Panel de ejecución de ruta ── */}
      {routeActive && currentCustomer && (
        <View style={styles.activeRoutePanel}>
          <View style={styles.activeRouteHeader}>
            <View>
              <Text style={styles.activeRouteLabel}>
                Parada {routeStep + 1} de {routeOrder.length}
              </Text>
              {/* Indicadores de progreso */}
              <View style={styles.progressDots}>
                {routeOrder.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.progressDot,
                      idx < routeStep && styles.progressDotDone,
                      idx === routeStep && styles.progressDotCurrent,
                    ]}
                  />
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.finishRouteBtn} onPress={() =>
              Alert.alert(
                "Finalizar ruta",
                "¿Quieres terminar la ruta ahora?",
                [
                  { text: "Continuar", style: "cancel" },
                  { text: "Finalizar", style: "destructive", onPress: finishRoute },
                ]
              )
            }>
              <Text style={styles.finishRouteBtnText}>✕ Salir</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.activeRouteName} numberOfLines={1}>
            {currentCustomer.name}
          </Text>
          {currentCustomer.address ? (
            <Text style={styles.activeRouteAddress} numberOfLines={1}>
              📍 {currentCustomer.address}
            </Text>
          ) : null}

          <View style={styles.activeRouteBtns}>
            <TouchableOpacity
              style={styles.visitBtn}
              onPress={visitCurrentCustomer}
            >
              <Text style={styles.visitBtnText}>Visitar cliente →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextStopBtn}
              onPress={nextStop}
            >
              <Text style={styles.nextStopBtnText}>
                {routeStep < routeOrder.length - 1 ? "Saltar parada" : "Finalizar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Lista de clientes */}
      <FlatList
        style={styles.list}
        data={customers}
        keyExtractor={(c) => c.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        renderItem={({ item }) => {
          const routeIdx = routeOrder.findIndex((c) => c.id === item.id);
          const isCurrent = routeActive && routeIdx === routeStep;
          const isDone = routeActive && routeIdx >= 0 && routeIdx < routeStep;

          return (
            <View style={isDone && styles.doneItemWrapper}>
              <CustomerCard
                customer={item}
                onPress={() => {
                  if (routeActive) {
                    // En modo activo solo permite visitar el cliente actual
                    if (isCurrent) {
                      visitCurrentCustomer();
                    }
                    return;
                  }
                  if (routeMode) {
                    toggleRouteCustomer(item);
                  } else {
                    router.push(`/(vendor)/visit/${item.id}`);
                  }
                }}
              />
              {/* Badge de número de parada */}
              {routeIdx >= 0 && !isDone && (
                <View
                  style={[
                    styles.routeNumBadge,
                    isCurrent && styles.routeNumBadgeCurrent,
                  ]}
                  pointerEvents="none"
                >
                  <Text style={styles.routeNumText}>{routeIdx + 1}</Text>
                </View>
              )}
              {/* Badge de completado */}
              {isDone && (
                <View style={styles.doneNumBadge} pointerEvents="none">
                  <Text style={styles.doneNumText}>✓</Text>
                </View>
              )}
              {/* Indicador de parada actual */}
              {isCurrent && (
                <View style={styles.currentStopIndicator} pointerEvents="none">
                  <Text style={styles.currentStopText}>PARADA ACTUAL</Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              No hay clientes asignados. Pide al admin que te asigne clientes.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  mapContainer: { height: 260, position: "relative" },
  list: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyText: { color: "#6b7280", fontSize: 14, textAlign: "center", lineHeight: 22 },

  // Botón Mi ubicación
  myLocationBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#fff",
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  myLocationIcon: { fontSize: 22 },

  // Botón Armar ruta
  routeModeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  routeModeBtnActive: { backgroundColor: "#1e40af" },
  routeModeBtnText: { fontSize: 13, fontWeight: "700", color: "#1e40af" },
  routeModeBtnTextActive: { color: "#fff" },

  // ── Panel de planificación ──
  routePanel: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 8,
  },
  routeChipsContent: { alignItems: "center", paddingRight: 8 },
  routeHint: { color: "#9ca3af", fontSize: 13, paddingVertical: 6 },
  routeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  routeChipBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1e40af",
    justifyContent: "center",
    alignItems: "center",
  },
  routeChipBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  routeChipName: { fontSize: 13, fontWeight: "600", color: "#1e40af", maxWidth: 100 },
  routeChipRemove: { fontSize: 11, color: "#93c5fd" },
  startRouteBtn: {
    backgroundColor: "#1e40af",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  startRouteBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // ── Panel de ejecución de ruta ──
  activeRoutePanel: {
    backgroundColor: "#1e3a8a",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  activeRouteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  activeRouteLabel: { color: "#93c5fd", fontSize: 12, fontWeight: "600" },
  progressDots: { flexDirection: "row", gap: 4, marginTop: 4 },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
  },
  progressDotDone: { backgroundColor: "#22c55e" },
  progressDotCurrent: { backgroundColor: "#fff", width: 12, height: 12, borderRadius: 6 },
  finishRouteBtn: {
    backgroundColor: "#1e40af",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  finishRouteBtnText: { color: "#93c5fd", fontSize: 12, fontWeight: "700" },
  activeRouteName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  activeRouteAddress: { color: "#bfdbfe", fontSize: 13 },
  activeRouteBtns: { flexDirection: "row", gap: 8, marginTop: 4 },
  visitBtn: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  visitBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  nextStopBtn: {
    backgroundColor: "#1e3a8a",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  nextStopBtnText: { color: "#93c5fd", fontWeight: "600", fontSize: 13 },

  // Lista — items de ruta
  doneItemWrapper: { opacity: 0.5 },
  routeNumBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#1e40af",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  routeNumBadgeCurrent: { backgroundColor: "#2563eb", width: 30, height: 30, borderRadius: 15 },
  routeNumText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  doneNumBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  doneNumText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  currentStopIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1e40af",
    paddingVertical: 3,
    alignItems: "center",
  },
  currentStopText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
});
