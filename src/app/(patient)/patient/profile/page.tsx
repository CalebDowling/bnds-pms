"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Allergy {
  allergen: string;
  reaction?: string;
  severity: string;
}

interface Insurance {
  id: string;
  memberId: string;
  priority: string;
  thirdPartyPlan?: {
    planName: string;
  };
}

interface PhoneNumber {
  number: string;
  phoneType: string;
  isPrimary: boolean;
  acceptsSms: boolean;
}

interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  addressType: string;
  isDefault: boolean;
}

interface PatientProfile {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  mrn: string;
  dateOfBirth: string;
  email?: string;
  gender?: string;
  preferredContact: string;
  phoneNumbers: PhoneNumber[];
  addresses: Address[];
  allergies: Allergy[];
  insurance: Insurance[];
}

export default function ProfilePage(): React.ReactNode {
  const router = useRouter();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("patient_token");

      if (!token) {
        router.push("/patient");
        return;
      }

      fetchProfile(token);
    };

    checkAuth();
  }, [router]);

  const fetchProfile = async (token: string) => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("/api/patient-portal/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch profile");
      const data = await response.json();

      setProfile(data.patient);
    } catch (err) {
      setError("Failed to load profile");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading your profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-gray-600">Profile not found</p>
      </div>
    );
  }

  const primaryPhone = profile.phoneNumbers.find((p) => p.isPrimary);
  const defaultAddress = profile.addresses.find((a) => a.isDefault);
  const primaryInsurance = profile.insurance.find((i) => i.priority === "primary");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">View and manage your personal information.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Personal Information */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Personal Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">First Name</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {profile.firstName}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Last Name</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {profile.lastName}
            </p>
          </div>

          {profile.middleName && (
            <div>
              <p className="text-sm text-gray-600">Middle Name</p>
              <p className="text-base font-medium text-gray-900 mt-1">
                {profile.middleName}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600">Medical Record Number (MRN)</p>
            <p className="text-base font-mono font-medium text-gray-900 mt-1">
              {profile.mrn}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Date of Birth</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {new Date(profile.dateOfBirth).toLocaleDateString()}
            </p>
          </div>

          {profile.gender && (
            <div>
              <p className="text-sm text-gray-600">Gender</p>
              <p className="text-base font-medium text-gray-900 mt-1">
                {profile.gender}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Contact Information
        </h2>

        <div className="space-y-6">
          {/* Email */}
          {profile.email && (
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-base font-medium text-gray-900 mt-1">
                {profile.email}
              </p>
            </div>
          )}

          {/* Primary Phone */}
          {primaryPhone && (
            <div>
              <p className="text-sm text-gray-600">
                Primary Phone ({primaryPhone.phoneType})
              </p>
              <p className="text-base font-medium text-gray-900 mt-1">
                {primaryPhone.number}
              </p>
              {primaryPhone.acceptsSms && (
                <p className="text-xs text-gray-500 mt-1">
                  ✓ Accepts SMS messages
                </p>
              )}
            </div>
          )}

          {/* Other Phones */}
          {profile.phoneNumbers.filter((p) => !p.isPrimary).length > 0 && (
            <div>
              <p className="text-sm text-gray-600">Other Phone Numbers</p>
              <div className="space-y-2 mt-2">
                {profile.phoneNumbers
                  .filter((p) => !p.isPrimary)
                  .map((phone, idx) => (
                    <p key={idx} className="text-sm text-gray-900">
                      {phone.number} ({phone.phoneType})
                    </p>
                  ))}
              </div>
            </div>
          )}

          {/* Preferred Contact */}
          <div>
            <p className="text-sm text-gray-600">Preferred Contact Method</p>
            <p className="text-base font-medium text-gray-900 mt-1 capitalize">
              {profile.preferredContact}
            </p>
          </div>
        </div>
      </div>

      {/* Address */}
      {defaultAddress && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Address</h2>

          <div className="space-y-2">
            <p className="text-base font-medium text-gray-900">
              {defaultAddress.line1}
            </p>
            {defaultAddress.line2 && (
              <p className="text-base text-gray-900">{defaultAddress.line2}</p>
            )}
            <p className="text-base text-gray-900">
              {defaultAddress.city}, {defaultAddress.state}{" "}
              {defaultAddress.zip}
            </p>
          </div>
        </div>
      )}

      {/* Allergies */}
      {profile.allergies.length > 0 && (
        <div className="border border-red-200 rounded-lg p-6 bg-red-50">
          <h2 className="text-lg font-semibold text-red-900 mb-6">
            ⚠️ Allergies
          </h2>

          <div className="space-y-4">
            {profile.allergies.map((allergy, idx) => (
              <div key={idx} className="border-l-4 border-red-600 pl-4">
                <p className="font-medium text-red-900">{allergy.allergen}</p>
                {allergy.reaction && (
                  <p className="text-sm text-red-800 mt-1">
                    Reaction: {allergy.reaction}
                  </p>
                )}
                <p className="text-sm text-red-800 mt-1">
                  Severity:{" "}
                  <span className="font-medium capitalize">
                    {allergy.severity}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insurance Information */}
      {primaryInsurance && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Insurance Information
          </h2>

          <div className="space-y-4">
            {primaryInsurance.thirdPartyPlan && (
              <div>
                <p className="text-sm text-gray-600">Carrier</p>
                <p className="text-base font-medium text-gray-900 mt-1">
                  {primaryInsurance.thirdPartyPlan.planName}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600">Member ID</p>
              <p className="text-base font-mono font-medium text-gray-900 mt-1">
                {primaryInsurance.memberId}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Information Note */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          To update your profile information, please contact the pharmacy at
          (555) 123-4567 or visit us in person. We maintain accurate records
          to ensure your safety.
        </p>
      </div>
    </div>
  );
}
