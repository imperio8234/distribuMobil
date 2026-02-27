import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useLocation } from "@/hooks/useLocation";

export default function VendorLayout() {
  const { startLocationTracking, stopLocationTracking } = useLocation();

  useEffect(() => {
    startLocationTracking();
    return () => stopLocationTracking();
    // Solo al montar/desmontar el layout de vendedor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1e40af",
        tabBarInactiveTintColor: "#9ca3af",
        headerStyle: { backgroundColor: "#1e40af" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: "Mis Clientes",
          tabBarLabel: "Clientes",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>📍</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="my-visits"
        options={{
          title: "Mis Visitas",
          tabBarLabel: "Mis Visitas",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="new-customer"
        options={{
          title: "Nuevo Cliente",
          tabBarLabel: "Agregar",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>➕</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Mi Perfil",
          tabBarLabel: "Perfil",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>👤</Text>
          ),
        }}
      />
      {/* Pantallas sin tab — modales y flujos anidados */}
      <Tabs.Screen name="visit/[id]" options={{ href: null }} />
      <Tabs.Screen name="edit-customer/[id]" options={{ href: null }} />
    </Tabs>
  );
}
