import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { customersApi } from "@/services/api";
import { useLocation } from "@/hooks/useLocation";

export default function NewCustomerScreen() {
  const [name, setName]           = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone]         = useState("");
  const [address, setAddress]     = useState("");
  const [notes, setNotes]         = useState("");
  const [photoUri, setPhotoUri]   = useState<string | undefined>();
  const [loading, setLoading]     = useState(false);
  const { location, loading: locLoading, getLocation } = useLocation();

  // ── Facturación electrónica ──────────────────────────────
  const [requiresInvoice, setRequiresInvoice]             = useState(false);
  const [billingId, setBillingId]                         = useState("");
  const [billingIdType, setBillingIdType]                 = useState("3"); // CC por defecto
  const [billingLegalOrg, setBillingLegalOrg]             = useState("2"); // Natural
  const [billingTribute, setBillingTribute]               = useState("21"); // No resp IVA
  const [billingMunicipalityId, setBillingMunicipalityId] = useState("");
  const [billingEmail, setBillingEmail]                   = useState("");

  async function pickPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso denegado", "Necesitamos acceso a la cámara.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("El nombre del negocio es obligatorio");
      return;
    }
    if (!location) {
      Alert.alert(
        "Ubicación requerida",
        "Toca 'Obtener ubicación GPS' estando en el local del cliente."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await customersApi.create({
        name:      name.trim(),
        ownerName: ownerName.trim() || undefined,
        phone:     phone.trim() || undefined,
        address:   address.trim() || undefined,
        lat:       location.lat,
        lng:       location.lng,
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

      // Subir foto si se tomó una
      if (photoUri && res.data?.id) {
        try {
          await customersApi.uploadPhoto(res.data.id, photoUri);
        } catch {
          Alert.alert(
            "Cliente guardado",
            `"${name}" fue agregado pero no se pudo subir la foto. Puedes intentarlo de nuevo desde la ficha del cliente.`,
            [{ text: "OK", onPress: () => router.back() }]
          );
          return;
        }
      }

      Alert.alert("Cliente registrado", `"${name}" fue agregado exitosamente.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "No se pudo guardar el cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
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

      <Text style={styles.label}>Dirección (referencia)</Text>
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
        placeholder="Horario de atención, preferencias, referencias del local..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      {/* Botón GPS */}
      <TouchableOpacity
        style={[styles.gpsButton, location ? styles.gpsActive : styles.gpsIdle]}
        onPress={getLocation}
        disabled={locLoading}
      >
        {locLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.gpsText}>
            {location
              ? `GPS capturado: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
              : "Obtener ubicación GPS"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Foto de fachada */}
      {photoUri ? (
        <TouchableOpacity onPress={pickPhoto} style={styles.photoPreviewContainer}>
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          <View style={styles.photoOverlay}>
            <Text style={styles.photoOverlayText}>Cambiar foto</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
          <Text style={styles.photoText}>📷  Tomar foto de fachada</Text>
        </TouchableOpacity>
      )}

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
        style={[styles.saveButton, loading && styles.saveDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Guardar cliente</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, gap: 6, paddingBottom: 40 },
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
  gpsButton: { padding: 14, borderRadius: 8, alignItems: "center", marginTop: 10 },
  gpsIdle: { backgroundColor: "#4b5563" },
  gpsActive: { backgroundColor: "#16a34a" },
  gpsText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  photoButton: {
    borderWidth: 1.5,
    borderColor: "#1e40af",
    borderStyle: "dashed",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  photoText: { color: "#1e40af", fontWeight: "600", fontSize: 14 },
  photoPreviewContainer: { marginTop: 8, borderRadius: 8, overflow: "hidden", height: 160 },
  photoPreview: { width: "100%", height: 160, resizeMode: "cover" },
  photoOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.45)", paddingVertical: 6, alignItems: "center",
  },
  photoOverlayText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  // Sección facturación
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
  // Botón guardar
  saveButton: {
    backgroundColor: "#1e40af",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
