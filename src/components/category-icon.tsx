/**
 * Los íconos de las categorías, los mismos nombres que usa la app (Material
 * Symbols) dibujados como trazos de 24 px, como el resto de los íconos.
 */
const paths: Record<string, string[]> = {
  payments: ["M2 7h20v10H2z", "M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", "M6 7V5h14v2"],
  work: ["M3 8h18v12H3z", "M8 8V5h8v3", "M3 13h18"],
  storefront: ["M4 10v10h16V10", "M3 4h18l-1 6H4L3 4Z", "M9 20v-6h6v6"],
  family_restroom: [
    "M7 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    "M17 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    "M4 22v-8l1-6h4l1 6v8",
    "M14 22v-6h-1l2-8h4l2 8h-1v6",
  ],
  trending_up: ["m3 17 6-6 4 4 8-8", "M15 7h6v6"],
  add_card: ["M2 6h20v12H2z", "M2 10h20", "M16 14h4", "M18 12v4"],
  home: ["M3 11 12 4l9 7", "M5 10v10h14V10", "M10 20v-6h4v6"],
  bolt: ["M13 2 4 14h7l-1 8 9-12h-7l1-8Z"],
  shopping_cart: [
    "M3 4h2l2.5 11h11L21 7H7",
    "M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
    "M18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  ],
  directions_bus: ["M5 4h14v13H5z", "M5 11h14", "M7 17v3", "M17 17v3", "M8 14h.01", "M16 14h.01"],
  medical_services: ["M3 7h18v13H3z", "M9 7V4h6v3", "M12 10v7", "M8.5 13.5h7"],
  school: ["M2 9 12 4l10 5-10 5L2 9Z", "M6 11v5c3 2 9 2 12 0v-5", "M22 9v6"],
  credit_card: ["M2 6h20v12H2z", "M2 10h20", "M6 15h4"],
  shield: ["M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"],
  restaurant: ["M7 2v20", "M4 2v6a3 3 0 0 0 6 0V2", "M17 22V2c-2.5 1-4 4-4 8h4"],
  delivery_dining: [
    "M3 15h10l2-6h4",
    "M6 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    "M18 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    "M4 9h6v4H4z",
  ],
  movie: ["M3 5h18v14H3z", "M3 9h18", "m7 5 2 4", "m13 5 2 4"],
  subscriptions: ["M4 9h16v11H4z", "M6 6h12", "M8 3h8", "m11 12 4 2.5-4 2.5v-5Z"],
  shopping_bag: ["M5 8h14l-1 12H6L5 8Z", "M9 8V6a3 3 0 0 1 6 0v2"],
  flight: ["M2 13l20-6-6 13-3-6-6-1-5 0Z"],
  spa: [
    "M12 21c-5 0-8-3-8-7 3 0 6 1 8 4 2-3 5-4 8-4 0 4-3 7-8 7Z",
    "M12 18c-2-3-2-8 0-13 2 5 2 10 0 13Z",
  ],
  redeem: [
    "M3 9h18v4H3z",
    "M5 13v8h14v-8",
    "M12 9v12",
    "M12 9C10 5 7 5 7 7.5S12 9 12 9Z",
    "M12 9c2-4 5-4 5-1.5S12 9 12 9Z",
  ],
  more_horiz: ["M6 12h.01", "M12 12h.01", "M18 12h.01"],
};

/** Los nombres que se pueden elegir al crear o editar una categoría, como en la app. */
export const CATEGORY_ICONS = Object.keys(paths);

export function CategoryIcon({ name, className = "size-5" }: { name: string; className?: string }) {
  const lines = paths[name] ?? paths.more_horiz!;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${className} shrink-0 fill-none stroke-current stroke-[1.9] [stroke-linecap:round] [stroke-linejoin:round]`}
    >
      {lines.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
