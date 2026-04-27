import { redirect } from "next/navigation";

// Insurance claims live at /insurance in the redesign.
// This route is preserved for legacy bookmarks.
export default function BillingClaimsRedirect() {
  redirect("/insurance");
}
