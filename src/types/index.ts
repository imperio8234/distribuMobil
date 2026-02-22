export type Role = "ADMIN" | "VENDOR" | "DELIVERY";
export type VisitResult = "ORDER_TAKEN" | "NOT_HOME" | "REFUSED";
export type OrderStatus = "PENDING" | "IN_DELIVERY" | "DELIVERED" | "CANCELLED";
export type DeliveryStatus = "PENDING" | "DELIVERED" | "FAILED";
export type ColdStatus = "HOT" | "WARM" | "COLD" | "FROZEN";
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  companyName: string;
  token: string;
}

export interface Customer {
  id: string;
  name: string;
  ownerName: string | null;
  phone: string | null;
  address: string | null;
  lat: number;
  lng: number;
  photoUrl: string | null;
  lastVisitAt: string | null;
  coldStatus: ColdStatus;
  daysSinceVisit: number | null;
  assignedVendor: { id: string; name: string } | null;
  notes: string | null;
}

export interface CreateVisitPayload {
  customerId: string;
  result: VisitResult;
  orderAmount?: number;
  notes?: string;
  lat?: number;
  lng?: number;
}

export interface CheckInPayload {
  customerId: string;
  lat?: number;
  lng?: number;
}

export interface CheckOutPayload {
  result: VisitResult;
  reason?: string;
  orderAmount?: number;
  notes?: string;
  scheduledFor?: string;
  deliveryDate?: string; // ISO — fecha de entrega acordada con el cliente
}

export interface DeliveryOrder {
  orderId: string;
  deliveryId: string | null;
  amount: number;
  orderStatus: OrderStatus;   // estado del pedido (para lógica de botones y mapa)
  status: DeliveryStatus;     // estado del registro delivery
  deliveryDate: string | null;
  notes: string | null;
  customer: {
    id: string;
    name: string;
    address: string | null;
    lat: number;
    lng: number;
    phone: string | null;
  };
}

export interface RecentVisit {
  id: string;
  result: VisitResult | null;
  reason: string | null;
  orderAmount: number | null;
  notes: string | null;
  visitedAt: string;
  vendor: { id: string; name: string };
}

export interface CustomerDetail extends Customer {
  visits: RecentVisit[];
}

export interface CreateCustomerPayload {
  name: string;
  ownerName?: string;
  phone?: string;
  address?: string;
  lat: number;
  lng: number;
  photoUrl?: string;
  notes?: string;
}

export interface UpdateCustomerPayload {
  name?: string;
  ownerName?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  hotCustomers: number;
  warmCustomers: number;
  coldCustomers: number;
  frozenCustomers: number;
  pendingOrders: number;
  todayVisits: number;
  monthRevenue: number;
}

export interface VendorStats {
  assignedCustomers: number;
  visitedToday: number;
  pendingAlerts: number;
  scheduledToday: number;
}

export interface ScheduledVisit {
  id: string;
  customerId: string;
  vendorId: string;
  scheduledFor: string;
  notes: string | null;
  completed: boolean;
  customer: {
    id: string;
    name: string;
    address: string | null;
    lat: number;
    lng: number;
  };
}

export interface CompletedVisit {
  id: string;
  customer: { id: string; name: string; address: string | null };
  result: VisitResult | null;
  orderAmount: number | null;
  notes: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
}

export interface PendingItem {
  id: string;
  type: "scheduled";
  customer: {
    id: string;
    name: string;
    address: string | null;
    lat: number;
    lng: number;
  };
  scheduledFor: string;
  notes: string | null;
}

export interface CustomerAlert {
  id: string;
  name: string;
  address: string | null;
  lastVisitAt: string | null;
  lat: number;
  lng: number;
  daysSinceVisit: number | null;
}

export interface MyVisitsData {
  today: CompletedVisit[];
  pending: PendingItem[];
  alerts: CustomerAlert[];
}
