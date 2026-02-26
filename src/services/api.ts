import { useAuthStore } from "@/store/auth.store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (networkErr: any) {
    console.error(`[API] Network error on ${endpoint}:`, networkErr?.message ?? networkErr);
    throw new Error(`No se pudo conectar al servidor: ${networkErr?.message ?? "Error de red"}`);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(err.error ?? `Error ${response.status}`);
  }

  return response.json();
}

// ── Auth ────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: import("@/types").AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// ── Clientes ────────────────────────────────────────────────────
export const customersApi = {
  list: () =>
    request<{ data: import("@/types").Customer[] }>("/customers"),

  getOne: (id: string) =>
    request<{ data: import("@/types").CustomerDetail }>(`/customers/${id}`),

  create: (payload: import("@/types").CreateCustomerPayload) =>
    request<{ data: import("@/types").Customer }>("/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: import("@/types").UpdateCustomerPayload) =>
    request<{ data: import("@/types").Customer }>(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  uploadPhoto: async (customerId: string, imageUri: string) => {
    const token = useAuthStore.getState().token;

    const formData = new FormData();
    // React Native requiere el objeto { uri, type, name } para subir archivos
    formData.append("photo", {
      uri:  imageUri,
      type: "image/jpeg",
      name: "photo.jpg",
    } as unknown as Blob);

    const response = await fetch(`${BASE_URL}/customers/${customerId}/photo`, {
      method:  "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // No incluir Content-Type — fetch lo pone automáticamente con el boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Error al subir foto" }));
      throw new Error(err.error ?? "Error al subir foto");
    }

    return response.json() as Promise<{ data: { photoUrl: string } }>;
  },
};

// ── Visitas ─────────────────────────────────────────────────────
export const visitsApi = {
  create: (payload: import("@/types").CreateVisitPayload) =>
    request<{ data: { id: string } }>("/visits", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  checkIn: (payload: import("@/types").CheckInPayload) =>
    request<{ data: { id: string } }>("/visits/checkin", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  checkOut: (visitId: string, payload: import("@/types").CheckOutPayload) =>
    request<{ data: { id: string } }>(`/visits/${visitId}/checkout`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};

// ── Visitas programadas ──────────────────────────────────────────
export const scheduledVisitsApi = {
  list: () =>
    request<{ data: import("@/types").ScheduledVisit[] }>("/scheduled-visits"),

  create: (payload: { customerId: string; scheduledFor: string; notes?: string }) =>
    request<{ data: import("@/types").ScheduledVisit }>("/scheduled-visits", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

// ── Vendor ───────────────────────────────────────────────────────
export const vendorApi = {
  getStats: () =>
    request<{ data: import("@/types").VendorStats }>("/vendor/stats"),

  getMyVisits: () =>
    request<{ data: import("@/types").MyVisitsData }>("/vendor/my-visits"),
};

// ── Entregas (repartidor) ───────────────────────────────────────
export const deliveriesApi = {
  listToday: () =>
    request<{ data: import("@/types").DeliveryOrder[] }>("/deliveries/today"),

  markStarted: (orderId: string) =>
    request<{ data: { status: string } }>(`/deliveries/${orderId}/start`, {
      method: "PATCH",
      body: JSON.stringify({}),
    }),

  markDelivered: (orderId: string, notes?: string) =>
    request<{ data: { id: string } }>(`/deliveries/${orderId}/deliver`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    }),

  markFailed: (orderId: string, notes?: string) =>
    request<{ data: { id: string } }>(`/deliveries/${orderId}/fail`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    }),
};

// ── Dashboard (dueño) ───────────────────────────────────────────
export const dashboardApi = {
  getStats: () =>
    request<{ data: import("@/types").DashboardStats }>("/dashboard"),
};

// ── Usuarios (push token + ubicación) ───────────────────────────
export const usersApi = {
  savePushToken: (token: string) =>
    request<{ data: { ok: boolean } }>("/users/push-token", {
      method: "PATCH",
      body: JSON.stringify({ token }),
    }),

  updateLocation: (lat: number, lng: number) =>
    request<{ data: { ok: boolean } }>("/users/location", {
      method: "PATCH",
      body: JSON.stringify({ lat, lng }),
    }),
};
