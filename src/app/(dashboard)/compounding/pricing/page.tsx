export const dynamic = "force-dynamic";
import { CompoundPricingPage } from "./client";
import type { Formula } from "./client";
import { getFormulas } from "./actions";

export default async function Page() {
  let initialFormulas: Formula[] = [];

  try {
    initialFormulas = await getFormulas();
  } catch (error) {
    console.error("Failed to load formulas:", error);
  }

  return <CompoundPricingPage initialFormulas={initialFormulas} />;
}
