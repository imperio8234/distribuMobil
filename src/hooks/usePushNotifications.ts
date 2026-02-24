import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform, Alert } from "react-native";
import { usersApi } from "@/services/api";

// Configura el handler para notificaciones recibidas en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications(enabled: boolean = true) {
  const notificationListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    // Listener: notificación recibida en foreground
    notificationListenerRef.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body } = notification.request.content;
        if (title || body) {
          Alert.alert(title ?? "Notificación", body ?? "");
        }
      }
    );

    // Listener: usuario toca la notificación
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (_response) => {
        // Se puede navegar según _response.notification.request.content.data
      }
    );

    return () => {
      notificationListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!enabled || registeredRef.current) return;
    registeredRef.current = true;
    registerAndSavePushToken();
  }, [enabled]);
}

async function registerAndSavePushToken() {
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1e40af",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await usersApi.savePushToken(tokenData.data);
  } catch (err) {
    console.warn("[Push] No se pudo registrar el push token:", err);
  }
}
