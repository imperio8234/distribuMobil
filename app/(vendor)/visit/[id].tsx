import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { customersApi, visitsApi } from "@/services/api";
import { useLocation } from "@/hooks/useLocation";
import { ColdStatusBadge } from "@/components/ColdStatusBadge";
import type { CustomerDetail, VisitResult } from "@/types";

const RESULTS: { value: VisitResult; label: string; color: string }[] = [
  { value: "ORDER_TAKEN", label: "Pedido tomado", color: "#16a34a" },
  { value: "NOT_HOME", label: "No estaba", color: "#f59e0b" },
  { value: "REFUSED", label: "No quiso comprar", color: "#dc2626" },
];

const SCHEDULE_OPTIONS = [
  { label: "7 días", days: 7 },
  { label: "14 días", days: 14 },
  { label: "30 días", days: 30 },
];

const DELIVERY_OPTIONS = [
  { label: "Hoy",             days: 0 },
  { label: "Mañana",          days: 1 },
  { label: "Pasado mañana",   days: 2 },
];

function deliveryISODate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

const RESULT_LABEL: Record<VisitResult, string> = {
  ORDER_TAKEN: "Pedido tomado",
  NOT_HOME: "No estaba",
  REFUSED: "No quiso comprar",
};

const RESULT_COLOR: Record<VisitResult, string> = {
  ORDER_TAKEN: "#16a34a",
  NOT_HOME: "#f59e0b",
  REFUSED: "#dc2626",
};

export default function VisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  // Step 1: Check-in
  const [visitId, setVisitId] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // Step 2: Check-out form
  const [result, setResult] = useState<VisitResult | null>(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduleDays, setScheduleDays] = useState<number | null>(null);
  const [deliveryDays, setDeliveryDays] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { location, getLocation } = useLocation();

  useEffect(() => {
    getLocation();
    customersApi
      .getOne(id)
      .then(({ data }) => setCustomer(data))
      .catch(() => Alert.alert("Error", "No se pudo cargar el cliente"))
      .finally(() => setLoadingCustomer(false));
  }, [id]);

  async function handleCheckIn() {
    setCheckingIn(true);
    try {
      const res = await visitsApi.checkIn({
        customerId: id,
        lat: location?.lat,
        lng: location?.lng,
      });
      setVisitId(res.data.id);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "No se pudo registrar la llegada");
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    if (!visitId) return;
    if (!result) {
      Alert.alert("Selecciona el resultado de la visita");
      return;
    }
    if (result === "ORDER_TAKEN" && !amount) {
      Alert.alert("Ingresa el monto del pedido");
      return;
    }

    setSubmitting(true);
    try {
      const scheduledFor = scheduleDays
        ? new Date(Date.now() + scheduleDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      await visitsApi.checkOut(visitId, {
        result,
        reason: reason.trim() || undefined,
        orderAmount: result === "ORDER_TAKEN" ? Number(amount) : undefined,
        notes: notes.trim() || undefined,
        scheduledFor,
        deliveryDate: result === "ORDER_TAKEN" && deliveryDays !== null
          ? deliveryISODate(deliveryDays)
          : undefined,
      });

      Alert.alert("Visita completada", "El historial del cliente fue actualizado.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "No se pudo completar la visita");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNavigate() {
    if (!customer) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${customer.lat},${customer.lng}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "No se pudo abrir Google Maps")
    );
  }

  if (loadingCustomer) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Cliente no encontrado</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: customer.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Tarjeta del cliente */}
        <View style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <Text style={styles.customerName} numberOfLines={1}>
              {customer.name}
            </Text>
            <ColdStatusBadge
              status={customer.coldStatus}
              days={customer.daysSinceVisit}
            />
          </View>
          {customer.ownerName && (
            <Text style={styles.meta}>Dueño: {customer.ownerName}</Text>
          )}
          {customer.phone && (
            <Text style={styles.meta}>Tel: {customer.phone}</Text>
          )}
          {customer.address && (
            <Text style={styles.meta}>Dir: {customer.address}</Text>
          )}
          {customer.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Observaciones</Text>
              <Text style={styles.notesText}>{customer.notes}</Text>
            </View>
          )}

          {/* Botón editar */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push(`/(vendor)/edit-customer/${id}`)}
          >
            <Text style={styles.editBtnText}>Editar datos</Text>
          </TouchableOpacity>

          {/* Mini mapa */}
          <MapView
            style={styles.miniMap}
            region={{
              latitude: customer.lat,
              longitude: customer.lng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker
              coordinate={{ latitude: customer.lat, longitude: customer.lng }}
              title={customer.name}
            />
          </MapView>

          {/* Botón Navegar */}
          <TouchableOpacity style={styles.navigateBtn} onPress={handleNavigate}>
            <Text style={styles.navigateBtnText}>Navegar</Text>
          </TouchableOpacity>
        </View>

        {/* Historial de visitas recientes */}
        {customer.visits && customer.visits.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>Últimas visitas</Text>
            {customer.visits.map((v) => (
              <View key={v.id} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>
                    {new Date(v.visitedAt).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                  {v.reason && (
                    <Text style={styles.historyReason} numberOfLines={1}>
                      {v.reason}
                    </Text>
                  )}
                  {v.orderAmount && (
                    <Text style={styles.historyAmount}>
                      ${Number(v.orderAmount).toLocaleString("es-CO")} COP
                    </Text>
                  )}
                </View>
                {v.result && (
                  <View
                    style={[
                      styles.historyBadge,
                      { backgroundColor: RESULT_COLOR[v.result] + "22" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyBadgeText,
                        { color: RESULT_COLOR[v.result] },
                      ]}
                    >
                      {RESULT_LABEL[v.result]}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Paso 1: Check-in */}
        {!visitId ? (
          <View style={styles.checkInBox}>
            <Text style={styles.stepLabel}>Paso 1 — Registrar llegada</Text>
            <Text style={styles.stepHint}>
              Confirma que llegaste al cliente para iniciar la visita.
            </Text>
            {location && (
              <Text style={styles.gpsOk}>📍 GPS capturado</Text>
            )}
            <TouchableOpacity
              style={[styles.checkInBtn, checkingIn && styles.btnDisabled]}
              onPress={handleCheckIn}
              disabled={checkingIn}
              activeOpacity={0.8}
            >
              {checkingIn ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.checkInText}>Registrar llegada</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Paso 2: Formulario de check-out */
          <View style={{ gap: 8 }}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>
                ✅ Llegada registrada — completa la visita
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Motivo de la visita</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder="Seguimiento, cobranza, presentar producto..."
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.sectionTitle}>Resultado de la visita *</Text>
            <View style={styles.resultsCol}>
              {RESULTS.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.resultChip,
                    result === r.value && {
                      backgroundColor: r.color,
                      borderColor: r.color,
                    },
                  ]}
                  onPress={() => setResult(r.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.resultText,
                      result === r.value && { color: "#fff" },
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {result === "ORDER_TAKEN" && (
              <>
                <Text style={styles.sectionTitle}>Monto del pedido (COP) *</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="150000"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />

                <Text style={styles.sectionTitle}>Fecha de entrega *</Text>
                <View style={styles.scheduleRow}>
                  {DELIVERY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.days}
                      style={[
                        styles.scheduleChip,
                        deliveryDays === opt.days && styles.deliveryChipActive,
                      ]}
                      onPress={() =>
                        setDeliveryDays(deliveryDays === opt.days ? null : opt.days)
                      }
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.scheduleText,
                          deliveryDays === opt.days && styles.scheduleTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>Notas (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observaciones, preferencias del cliente..."
              multiline
              numberOfLines={3}
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.sectionTitle}>Programar próxima visita</Text>
            <View style={styles.scheduleRow}>
              {SCHEDULE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.days}
                  style={[
                    styles.scheduleChip,
                    scheduleDays === opt.days && styles.scheduleChipActive,
                  ]}
                  onPress={() =>
                    setScheduleDays(scheduleDays === opt.days ? null : opt.days)
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.scheduleText,
                      scheduleDays === opt.days && styles.scheduleTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitDisabled]}
              onPress={handleCheckOut}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Finalizar visita</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, gap: 8, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#6b7280", fontSize: 15 },

  // Tarjeta cliente
  customerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 4,
  },
  customerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  customerName: { fontSize: 17, fontWeight: "700", color: "#111827", flex: 1 },
  meta: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  notesBox: {
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#0ea5e9",
  },
  notesLabel: { fontSize: 11, fontWeight: "700", color: "#0369a1", marginBottom: 2 },
  notesText: { fontSize: 13, color: "#0c4a6e", lineHeight: 18 },
  editBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  editBtnText: { color: "#374151", fontWeight: "600", fontSize: 13 },
  miniMap: { height: 180, borderRadius: 8, marginTop: 12, overflow: "hidden" },
  navigateBtn: {
    marginTop: 10,
    backgroundColor: "#1e40af",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  navigateBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Historial
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 2,
  },
  historyTitle: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 8 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 8,
  },
  historyLeft: { flex: 1, gap: 2 },
  historyDate: { fontSize: 13, fontWeight: "600", color: "#374151" },
  historyReason: { fontSize: 12, color: "#9ca3af" },
  historyAmount: { fontSize: 12, color: "#16a34a", fontWeight: "600" },
  historyBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  historyBadgeText: { fontSize: 11, fontWeight: "700" },

  // Check-in
  checkInBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
  },
  stepLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
  stepHint: { fontSize: 13, color: "#6b7280", textAlign: "center" },
  gpsOk: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  checkInBtn: {
    backgroundColor: "#1e40af",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
  },
  checkInText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },
  stepIndicator: {
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  stepIndicatorText: { fontSize: 13, fontWeight: "600", color: "#16a34a" },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 12 },
  resultsCol: { gap: 8 },
  resultChip: {
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  resultText: { fontWeight: "600", color: "#374151", fontSize: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#111827",
  },
  textarea: { height: 88, textAlignVertical: "top" },
  scheduleRow: { flexDirection: "row", gap: 8 },
  scheduleChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  scheduleChipActive: { backgroundColor: "#1e40af", borderColor: "#1e40af" },
  deliveryChipActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  scheduleText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  scheduleTextActive: { color: "#fff" },
  submitButton: {
    backgroundColor: "#1e40af",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
