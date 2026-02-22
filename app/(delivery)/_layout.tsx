import { Stack, router } from "expo-router";
import { TouchableOpacity, Text, Alert } from "react-native";
import { useAuthStore } from "@/store/auth.store";

export default function DeliveryLayout() {
  const { logout } = useAuthStore();

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

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#1e40af" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        title: "Ruta del día",
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ paddingHorizontal: 4 }}>
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
              Salir
            </Text>
          </TouchableOpacity>
        ),
      }}
    />
  );
}
