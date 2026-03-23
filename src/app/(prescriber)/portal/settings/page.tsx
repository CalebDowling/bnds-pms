"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ProfileData {
  firstName: string;
  lastName: string;
  npi: string;
  email: string;
  phone: string;
  practiceName: string;
  deaNumber: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export default function SettingsPage(): React.ReactNode {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    npi: "",
    email: "",
    phone: "",
    practiceName: "",
    deaNumber: "",
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreferences>({
      emailNotifications: true,
      smsNotifications: false,
    });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    // Load settings from localStorage (in a real app, this would come from an API)
    const savedProfile = localStorage.getItem("prescriber_profile");
    if (savedProfile) {
      try {
        setProfileData(JSON.parse(savedProfile));
      } catch {
        // Use defaults
      }
    }

    const savedNotifications = localStorage.getItem(
      "notification_preferences"
    );
    if (savedNotifications) {
      try {
        setNotificationPrefs(JSON.parse(savedNotifications));
      } catch {
        // Use defaults
      }
    }
  }, []);

  const handleProfileChange = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    setSuccessMessage("");
  };

  const handlePasswordChange = (field: keyof PasswordData, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    setSuccessMessage("");
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      // In a real app, this would POST to an API
      localStorage.setItem("prescriber_profile", JSON.stringify(profileData));
      setSuccessMessage("Profile updated successfully");
      setActiveSection(null);
    } catch (err) {
      setError("Failed to update profile. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      // In a real app, this would POST to an API
      // For now, just clear the fields and show success
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSuccessMessage("Password changed successfully");
      setActiveSection(null);
    } catch (err) {
      setError("Failed to change password. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      localStorage.setItem(
        "notification_preferences",
        JSON.stringify(notificationPrefs)
      );
      setSuccessMessage("Notification preferences updated");
      setActiveSection(null);
    } catch (err) {
      setError("Failed to update preferences. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (
      !confirm(
        "Are you sure? This action cannot be undone. Your account will be permanently deactivated."
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      // In a real app, this would POST to an API
      localStorage.removeItem("prescriber_token");
      localStorage.removeItem("prescriber_name");
      localStorage.removeItem("prescriber_profile");
      router.push("/portal");
    } catch (err) {
      setError("Failed to deactivate account. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stagger-1 { animation: fadeUp 0.3s ease-out 0.05s both; }
        .stagger-2 { animation: fadeUp 0.3s ease-out 0.1s both; }
        .stagger-3 { animation: fadeUp 0.3s ease-out 0.15s both; }
      `}</style>

      {/* Header */}
      <div className="mb-6 stagger-1">
        <h1 className="text-[15px] font-semibold text-gray-900">Account Settings</h1>
        <p className="text-[13px] text-gray-600 mt-1">
          Manage your profile, password, and preferences
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl stagger-1">
          <p className="text-[13px] text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl stagger-2">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-4 stagger-3">
        {/* Profile Section */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button
            onClick={() =>
              setActiveSection(activeSection === "profile" ? null : "profile")
            }
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50"
          >
            <div className="text-left">
              <h2 className="font-semibold text-gray-900 text-[14px]">Profile Information</h2>
              <p className="text-[12px] text-gray-600 mt-1">
                Update your name, contact details, and practice information
              </p>
            </div>
            <span className="text-gray-400 text-lg">
              {activeSection === "profile" ? "−" : "+"}
            </span>
          </button>

          {activeSection === "profile" && (
            <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) =>
                      handleProfileChange("firstName", e.target.value)
                    }
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) =>
                      handleProfileChange("lastName", e.target.value)
                    }
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
                    NPI Number
                  </label>
                  <input
                    type="text"
                    value={profileData.npi}
                    onChange={(e) => handleProfileChange("npi", e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
                    DEA Number
                  </label>
                  <input
                    type="text"
                    value={profileData.deaNumber}
                    onChange={(e) =>
                      handleProfileChange("deaNumber", e.target.value)
                    }
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      handleProfileChange("email", e.target.value)
                    }
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) =>
                      handleProfileChange("phone", e.target.value)
                    }
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
                  Practice Name
                </label>
                <input
                  type="text"
                  value={profileData.practiceName}
                  onChange={(e) =>
                    handleProfileChange("practiceName", e.target.value)
                  }
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 flex gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2.5 bg-[#40721D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#355f1a] active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-900 text-[13px] font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button
            onClick={() =>
              setActiveSection(activeSection === "password" ? null : "password")
            }
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50"
          >
            <div className="text-left">
              <h2 className="font-semibold text-gray-900 text-[14px]">Change Password</h2>
              <p className="text-[12px] text-gray-600 mt-1">
                Update your account password regularly for security
              </p>
            </div>
            <span className="text-gray-400 text-lg">
              {activeSection === "password" ? "−" : "+"}
            </span>
          </button>

          {activeSection === "password" && (
            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    handlePasswordChange("currentPassword", e.target.value)
                  }
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    handlePasswordChange("newPassword", e.target.value)
                  }
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  At least 8 characters long
                </p>
              </div>

              <div>
                <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    handlePasswordChange("confirmPassword", e.target.value)
                  }
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
                  required
                />
              </div>

              <div className="pt-4 border-t border-gray-200 flex gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2.5 bg-[#40721D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#355f1a] active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm"
                >
                  {isLoading ? "Updating..." : "Update Password"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-900 text-[13px] font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Notification Preferences Section */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button
            onClick={() =>
              setActiveSection(
                activeSection === "notifications" ? null : "notifications"
              )
            }
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50"
          >
            <div className="text-left">
              <h2 className="font-semibold text-gray-900 text-[14px]">
                Notification Preferences
              </h2>
              <p className="text-[12px] text-gray-600 mt-1">
                Choose how you want to be notified about important updates
              </p>
            </div>
            <span className="text-gray-400 text-lg">
              {activeSection === "notifications" ? "−" : "+"}
            </span>
          </button>

          {activeSection === "notifications" && (
            <form onSubmit={handleNotificationSubmit} className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="emailNotif"
                    checked={notificationPrefs.emailNotifications}
                    onChange={(e) =>
                      setNotificationPrefs((prev) => ({
                        ...prev,
                        emailNotifications: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-[#40721D] border-gray-300 rounded focus:ring-[#40721D] cursor-pointer"
                  />
                  <label htmlFor="emailNotif" className="cursor-pointer flex-1">
                    <p className="text-[13px] font-semibold text-gray-900">
                      Email Notifications
                    </p>
                    <p className="text-[12px] text-gray-600">
                      Receive updates about orders, refills, and billing via email
                    </p>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="smsNotif"
                    checked={notificationPrefs.smsNotifications}
                    onChange={(e) =>
                      setNotificationPrefs((prev) => ({
                        ...prev,
                        smsNotifications: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-[#40721D] border-gray-300 rounded focus:ring-[#40721D] cursor-pointer"
                  />
                  <label htmlFor="smsNotif" className="cursor-pointer flex-1">
                    <p className="text-[13px] font-semibold text-gray-900">
                      SMS Text Notifications
                    </p>
                    <p className="text-[12px] text-gray-600">
                      Get urgent updates sent to your phone via text message
                    </p>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2.5 bg-[#40721D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#355f1a] active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm"
                >
                  {isLoading ? "Saving..." : "Save Preferences"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-900 text-[13px] font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 pt-8 border-t border-gray-300">
        <h3 className="text-[14px] font-semibold text-gray-900 mb-4">Danger Zone</h3>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <h4 className="font-semibold text-red-900 text-[14px] mb-2">
            Deactivate Your Account
          </h4>
          <p className="text-[13px] text-red-700 mb-4">
            Once you deactivate your account, there is no going back. Please be
            certain. All your account data will be permanently deleted.
          </p>
          <button
            onClick={handleDeactivateAccount}
            disabled={isLoading}
            className="px-4 py-2.5 bg-red-600 text-white text-[13px] font-semibold rounded-xl hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm"
          >
            {isLoading ? "Processing..." : "Deactivate Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
