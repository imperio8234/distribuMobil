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
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { customersApi } from "@/services/api";

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    customersApi
      .getOne(id)
      .then(({ data }) => {
        setName(data.name);
        setOwnerName(data.ownerName ?? "");
        setPhone(data.phone ?? "");
        setAddress(data.address ?? "");
        setNotes(data.notes ?? "");
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
        name: name.trim(),
        ownerName: ownerName.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
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
