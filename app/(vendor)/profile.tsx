import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  VENDOR: "Vendedor",
  DELIVERY: "Repartidor",
};

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  function handleLogout() {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  if (!user) return null;

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarBox}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userRole}>{ROLE_LABEL[user.role] ?? user.role}</Text>
      </View>

      {/* Info */}
      <View style={styles.card}>
        <InfoRow label="Correo" value={user.email} />
        <InfoRow label="Empresa" value={user.companyName} />
        <InfoRow label="Rol" value={ROLE_LABEL[user.role] ?? user.role} />
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 24,
    gap: 16,
  },
  avatarBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1e40af",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "700" },
  userName: { fontSize: 20, fontWeight: "700", color: "#111827" },
  userRole: { fontSize: 13, color: "#6b7280" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  infoValue: { fontSize: 14, color: "#111827", fontWeight: "600", maxWidth: "60%", textAlign: "right" },
  logoutBtn: {
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  logoutText: { color: "#dc2626", fontWeight: "700", fontSize: 15 },
});
