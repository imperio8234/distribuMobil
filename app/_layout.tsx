import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/store/auth.store";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { user, isLoading, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    SplashScreen.hideAsync();

    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    if (user.role === "DELIVERY") {
      router.replace("/(delivery)");
    } else {
      router.replace("/(vendor)");
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1e40af" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
