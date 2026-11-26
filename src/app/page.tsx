import { redirect } from "next/navigation";

/** La raíz abre el Map; el middleware ya mandó al inicio de sesión a quien no tiene sesión. */
export default function HomePage() {
  redirect("/map");
}
