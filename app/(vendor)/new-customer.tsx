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
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { customersApi } from "@/services/api";
import { useLocation } from "@/hooks/useLocation";
export default function NewCustomerScreen() {
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const { location, loading: locLoading, getLocation } = useLocation();

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
      await customersApi.create({
        name: name.trim(),
        ownerName: ownerName.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        lat: location.lat,
        lng: location.lng,
        notes: notes.trim() || undefined,
      });

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

      {/* Botón foto */}
      <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
        <Text style={styles.photoText}>
          {photoUri ? "Foto de fachada tomada" : "Tomar foto de fachada"}
        </Text>
      </TouchableOpacity>

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
  content: { padding: 20, gap: 6 },
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
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  photoText: { color: "#1e40af", fontWeight: "600" },
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
