export type OrderStatus = "en_attente" | "confirmee" | "annulee";

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "confirmee", label: "Confirmée" },
  { value: "annulee", label: "Annulée" },
];

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  old_price: number | null;
  delivery_home: number;
  delivery_desk: number;
  images: string[];
  features: string[];
  updated_at: string;
};

export type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  wilaya: string;
  commune: string;
  address: string | null;
  delivery_type: "domicile" | "stopdesk";
  stopdesk_id: number | null;
  stopdesk_name: string | null;
  quantity: number;
  total: number;
  status: OrderStatus;
  yalidine_tracking: string | null;
  yalidine_status: string | null;
  yalidine_label: string | null;
  notes: string | null;
};

export type Settings = {
  id: string;
  store_name: string;
  logo_url: string | null;
  primary_color: string;
  from_wilaya: string;
  updated_at: string;
};
