import { useState, useCallback } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";

interface Coords {
  lat: number;
  lng: number;
}

export function useLocation() {
  const [location, setLocation] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);

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

      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
    } catch {
      Alert.alert("Error GPS", "No se pudo obtener la ubicación. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { location, loading, getLocation };
}
