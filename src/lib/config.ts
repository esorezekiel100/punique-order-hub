// Public app configuration for PUNIQUE KITCHEN
export const BRAND = "PUNIQUE KITCHEN";
export const TAGLINE = "Bayelsa's warmest kitchen — cooked with love, delivered with speed.";
export const LOCATION = "Yenagoa, Bayelsa State";
export const WHATSAPP_NUMBER = "2348083163956"; // international format, no +
export const DELIVERY_AREAS = [
  "Amarata",
  "Ekeki",
  "Etegwe",
  "Kpansia",
  "Yenizue-Gene",
  "Opolo",
  "Okutukutu",
  "Tombia",
  "Agudama",
  "Biogbolo",
  "Swali",
  "Azikoro",
  "Onopa",
  "Igbogene",
];
export const ORDER_STATUS_LABEL: Record<string, string> = {
  received: "Order received",
  preparing: "Preparing your food",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
export const ORDER_STATUS_STEPS = [
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
] as const;