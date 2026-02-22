import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
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
  const [routeMode, setRouteMode] = useState(false);
  const [routeOrder, setRouteOrder] = useState<Customer[]>([]);

  const mapRef = useRef<MapView>(null);
  const { location, getLocation } = useLocation();

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

  function openRouteInMaps() {
    if (routeOrder.length === 0) {
      Alert.alert("Sin clientes", "Selecciona al menos un cliente para la ruta.");
      return;
    }

    const destination = routeOrder[routeOrder.length - 1];
    const destinationStr = `${destination.lat},${destination.lng}`;
    const waypoints = routeOrder
      .slice(0, -1)
      .map((c) => `${c.lat},${c.lng}`)
      .join("|");

    let url = `https://www.google.com/maps/dir/?api=1&destination=${destinationStr}`;
    if (location) url += `&origin=${location.lat},${location.lng}`;
    if (waypoints) url += `&waypoints=${waypoints}`;

    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "No se pudo abrir Google Maps")
    );
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

  return (
    <View style={styles.container}>
      {/* Mapa con controles flotantes */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          region={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {customers.map((c) => (
            <Marker
              key={c.id}
              coordinate={{ latitude: c.lat, longitude: c.lng }}
              title={c.name}
              description={
                c.daysSinceVisit != null
                  ? `${c.daysSinceVisit} días sin visita`
                  : "Sin visitas registradas"
              }
              pinColor={PIN_COLORS[c.coldStatus]}
              onCalloutPress={() => router.push(`/(vendor)/visit/${c.id}`)}
            />
          ))}
        </MapView>

        {/* Botón Mi ubicación */}
        <TouchableOpacity style={styles.myLocationBtn} onPress={handleMyLocation}>
          <Text style={styles.myLocationIcon}>📍</Text>
        </TouchableOpacity>

        {/* Botón Armar ruta */}
        <TouchableOpacity
          style={[styles.routeModeBtn, routeMode && styles.routeModeBtnActive]}
          onPress={() => {
            if (routeMode) {
              setRouteMode(false);
              setRouteOrder([]);
            } else {
              setRouteMode(true);
            }
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
      </View>

      {/* Panel de ruta activa */}
      {routeMode && (
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
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          {routeOrder.length > 0 && (
            <TouchableOpacity style={styles.openMapsBtn} onPress={openRouteInMaps}>
              <Text style={styles.openMapsBtnText}>Abrir en Maps</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Lista de clientes ordenados por cliente más frío */}
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
          return (
            <View>
              <CustomerCard
                customer={item}
                onPress={() => {
                  if (routeMode) {
                    toggleRouteCustomer(item);
                  } else {
                    router.push(`/(vendor)/visit/${item.id}`);
                  }
                }}
              />
              {routeMode && routeIdx >= 0 && (
                <View style={styles.routeNumBadge} pointerEvents="none">
                  <Text style={styles.routeNumText}>{routeIdx + 1}</Text>
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

  // Panel de ruta
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
  openMapsBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  openMapsBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Badge de orden en la lista
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
  routeNumText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
