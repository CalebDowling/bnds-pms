import { redirect } from "next/navigation";
import CommunicationsClient from "./client";

export const dynamic = "force-dynamic";

export default async function CommunicationsPage() {
  return <CommunicationsClient />;
}
