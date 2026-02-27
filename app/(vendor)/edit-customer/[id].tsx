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
  Switch,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { customersApi } from "@/services/api";

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const [name, setName]           = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone]         = useState("");
  const [address, setAddress]     = useState("");
  const [notes, setNotes]         = useState("");

  // ── Facturación electrónica ──────────────────────────────
  const [requiresInvoice, setRequiresInvoice]             = useState(false);
  const [billingId, setBillingId]                         = useState("");
  const [billingIdType, setBillingIdType]                 = useState("3");
  const [billingLegalOrg, setBillingLegalOrg]             = useState("2");
  const [billingTribute, setBillingTribute]               = useState("21");
  const [billingMunicipalityId, setBillingMunicipalityId] = useState("");
  const [billingEmail, setBillingEmail]                   = useState("");

  useEffect(() => {
    customersApi
      .getOne(id)
      .then(({ data }) => {
        setName(data.name);
        setOwnerName(data.ownerName ?? "");
        setPhone(data.phone ?? "");
        setAddress(data.address ?? "");
        setNotes(data.notes ?? "");
        // Billing
        setRequiresInvoice(data.requiresInvoice ?? false);
        setBillingId(data.billingId ?? "");
        setBillingIdType(data.billingIdType ?? "3");
        setBillingLegalOrg(data.billingLegalOrg ?? "2");
        setBillingTribute(data.billingTribute ?? "21");
        setBillingMunicipalityId(data.billingMunicipalityId ?? "");
        setBillingEmail(data.billingEmail ?? "");
      })
      .catch(() => Alert.alert("Error", "No se pudo cargar el cliente"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("El nombre del negocio es obligatorio");
      return;
    }
    setSaving(true);
    try {
      await customersApi.update(id, {
        name:      name.trim(),
        ownerName: ownerName.trim() || undefined,
        phone:     phone.trim() || undefined,
        address:   address.trim() || undefined,
        notes:     notes.trim() || undefined,
        // Facturación
        requiresInvoice,
        ...(requiresInvoice ? {
          billingId:             billingId.trim() || undefined,
          billingIdType,
          billingLegalOrg,
          billingTribute,
          billingMunicipalityId: billingMunicipalityId.trim() || undefined,
          billingEmail:          billingEmail.trim() || undefined,
        } : {}),
      });
      Alert.alert("Guardado", "Los datos del cliente fueron actualizados.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Editar cliente" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Nombre del negocio *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Tienda Don Mario"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Nombre del dueño</Text>
        <TextInput
          style={styles.input}
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder="Mario García"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="300 123 4567"
          keyboardType="phone-pad"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Dirección</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Cra 5 #12-34, Barrio Centro"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Observaciones</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Horario, preferencias, referencias..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* ── Facturación electrónica ───────────────────────── */}
        <View style={styles.sectionDivider} />
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>¿Requiere factura electrónica?</Text>
            <Text style={styles.switchHint}>El cliente pide factura DIAN</Text>
          </View>
          <Switch
            value={requiresInvoice}
            onValueChange={setRequiresInvoice}
            trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
            thumbColor="#fff"
          />
        </View>

        {requiresInvoice && (
          <View style={styles.billingSection}>
            <Text style={styles.billingTitle}>Datos de facturación</Text>

            <Text style={styles.label}>Tipo de documento</Text>
            <View style={styles.segmentRow}>
              {[
                { label: "CC", value: "3" },
                { label: "NIT", value: "6" },
                { label: "Pasaporte", value: "7" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segment, billingIdType === opt.value && styles.segmentActive]}
                  onPress={() => setBillingIdType(opt.value)}
                >
                  <Text style={[styles.segmentText, billingIdType === opt.value && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Número de identificación</Text>
            <TextInput
              style={styles.input}
              value={billingId}
              onChangeText={setBillingId}
              placeholder="Ej: 123456789"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.label}>Tipo de persona</Text>
            <View style={styles.segmentRow}>
              {[
                { label: "Natural", value: "2" },
                { label: "Jurídica", value: "1" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segment, billingLegalOrg === opt.value && styles.segmentActive]}
                  onPress={() => setBillingLegalOrg(opt.value)}
                >
                  <Text style={[styles.segmentText, billingLegalOrg === opt.value && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Régimen tributario</Text>
            <View style={styles.segmentRow}>
              {[
                { label: "No resp. IVA", value: "21" },
                { label: "Resp. IVA", value: "1" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segment, billingTribute === opt.value && styles.segmentActive]}
                  onPress={() => setBillingTribute(opt.value)}
                >
                  <Text style={[styles.segmentText, billingTribute === opt.value && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>ID Municipio (Factus)</Text>
            <TextInput
              style={styles.input}
              value={billingMunicipalityId}
              onChangeText={setBillingMunicipalityId}
              placeholder="Ej: 980 (Bogotá)"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.label}>Email para factura</Text>
            <TextInput
              style={styles.input}
              value={billingEmail}
              onChangeText={setBillingEmail}
              placeholder="cliente@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, gap: 6, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#111827",
  },
  textarea: { height: 88 },
  // Facturación
  sectionDivider: { height: 1, backgroundColor: "#e5e7eb", marginTop: 20, marginBottom: 4 },
  switchRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: "#e5e7eb", marginTop: 4,
  },
  switchLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  switchHint: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  billingSection: {
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bae6fd",
    marginTop: 8,
    gap: 2,
  },
  billingTitle: { fontSize: 13, fontWeight: "700", color: "#0369a1", marginBottom: 4 },
  segmentRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  segment: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff",
    alignItems: "center",
  },
  segmentActive: { backgroundColor: "#1e40af", borderColor: "#1e40af" },
  segmentText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  segmentTextActive: { color: "#fff" },
  // Botón
  saveBtn: {
    backgroundColor: "#1e40af",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
