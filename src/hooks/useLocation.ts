import { useState, useCallback, useRef } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { usersApi } from "@/services/api";

const TRACKING_INTERVAL_MS = 30_000; // 30 segundos

interface Coords {
  lat: number;
  lng: number;
}

export function useLocation() {
  const [location, setLocation] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const trackingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getLocation = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Necesitamos acceso a tu ubicación para registrar la posición."
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords: Coords = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };
      setLocation(coords);
      return coords;
    } catch {
      Alert.alert("Error GPS", "No se pudo obtener la ubicación. Intenta de nuevo.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Inicia el reporte periódico de ubicación al servidor (cada 30s) */
  const startLocationTracking = useCallback(async () => {
    if (isTracking) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    setIsTracking(true);

    // Enviar inmediatamente la primera vez
    const sendLocation = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords: Coords = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        };
        setLocation(coords);
        await usersApi.updateLocation(coords.lat, coords.lng);
      } catch {
        // Silencioso — no interrumpir la UX si falla el reporte
      }
    };

    await sendLocation();

    trackingIntervalRef.current = setInterval(sendLocation, TRACKING_INTERVAL_MS);
  }, [isTracking]);

  /** Detiene el reporte periódico de ubicación */
  const stopLocationTracking = useCallback(() => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    setIsTracking(false);
  }, []);

  return { location, loading, isTracking, getLocation, startLocationTracking, stopLocationTracking };
}
