import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import GlobalSearch from "./GlobalSearch";

export default async function Header() {
  const user = await getCurrentUser();

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "User";
  const initials = user
    ? `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase()
    : "U";
  const roleLabel = user?.isPharmacist ? "Pharmacist" : "Staff";

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 left-64 right-0 z-10">
      <div>
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{displayName}</p>
          <p className="text-xs text-gray-400">{roleLabel}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#40721D] flex items-center justify-center">
          <span className="text-xs font-bold text-white">{initials}</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
