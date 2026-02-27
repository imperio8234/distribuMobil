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
    if (!enabled) return;
    let cancelled = false;
    registerAndSavePushToken()
      .then((ok) => {
        if (ok && !cancelled) registeredRef.current = true;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);
}

// projectId de EAS (app.json extra.eas.projectId) — necesario para getExpoPushTokenAsync
const EAS_PROJECT_ID = "39f2e193-a9a9-425a-92a1-74fb2a89ed1e";

async function registerAndSavePushToken(): Promise<boolean> {
  if (!Device.isDevice) return false;

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

  if (finalStatus !== "granted") {
    console.warn("[Push] Permisos de notificación no concedidos.");
    return false;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId ??
      EAS_PROJECT_ID;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    if (!tokenData?.data) {
      console.warn("[Push] No se obtuvo token de Expo.");
      return false;
    }

    await usersApi.savePushToken(tokenData.data);
    return true;
  } catch (err) {
    console.warn("[Push] No se pudo registrar el push token:", err);
    return false;
  }
}
