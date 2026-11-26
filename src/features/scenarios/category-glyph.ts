/**
 * El ícono de una categoría en la web. La API guarda el nombre del ícono de
 * Material que usa la app (`restaurant`, `home`…); la web no tiene esa fuente,
 * así que lo muestra con un emoji equivalente. Sin equivalente, la inicial.
 */
const GLYPHS: Readonly<Record<string, string>> = {
  payments: "💵",
  work: "💼",
  storefront: "🏪",
  family_restroom: "👪",
  trending_up: "📈",
  add_card: "💳",
  credit_card: "💳",
  home: "🏠",
  bolt: "⚡",
  shopping_cart: "🛒",
  directions_bus: "🚌",
  directions_car: "🚗",
  local_gas_station: "⛽",
  medical_services: "🩺",
  school: "🎓",
  shield: "🛡️",
  restaurant: "🍽️",
  local_cafe: "☕",
  delivery_dining: "🛵",
  movie: "🎬",
  subscriptions: "📺",
  shopping_bag: "🛍️",
  flight: "✈️",
  spa: "💆",
  redeem: "🎁",
  celebration: "🎉",
  pets: "🐾",
  fitness_center: "🏋️",
  sports_esports: "🎮",
  phone_iphone: "📱",
  wifi: "📶",
  savings: "🐷",
  more_horiz: "⋯",
};

export function categoryGlyph(icon: string | null | undefined, name: string): string {
  return (icon && GLYPHS[icon]) || name.trim().charAt(0).toUpperCase() || "•";
}
