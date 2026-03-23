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
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-sm sm:text-base text-gray-600">View and manage your personal information.</p>
        </div>

        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-40 mb-6 animate-pulse"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j}>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-20 mb-2 animate-pulse"></div>
                    <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-32 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 sm:py-16 border border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white">
        <svg className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-base sm:text-lg text-gray-600 font-semibold">Profile not found</p>
      </div>
    );
  }

  const primaryPhone = profile.phoneNumbers.find((p) => p.isPrimary);
  const defaultAddress = profile.addresses.find((a) => a.isDefault);
  const primaryInsurance = profile.insurance.find((i) => i.priority === "primary");

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-sm sm:text-base text-gray-600">View and manage your personal information.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Personal Information */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#40721D]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          Personal Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">First Name</p>
            <p className="text-base font-semibold text-gray-900 mt-2">
              {profile.firstName}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Last Name</p>
            <p className="text-base font-semibold text-gray-900 mt-2">
              {profile.lastName}
            </p>
          </div>

          {profile.middleName && (
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Middle Name</p>
              <p className="text-base font-semibold text-gray-900 mt-2">
                {profile.middleName}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Medical Record Number (MRN)</p>
            <p className="text-base font-mono font-semibold text-[#40721D] mt-2">
              {profile.mrn}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Date of Birth</p>
            <p className="text-base font-semibold text-gray-900 mt-2">
              {new Date(profile.dateOfBirth).toLocaleDateString()}
            </p>
          </div>

          {profile.gender && (
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Gender</p>
              <p className="text-base font-semibold text-gray-900 mt-2">
                {profile.gender}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#40721D]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.79l.291 2.328a1 1 0 01-.523 1.021l-1.902.953a11.002 11.002 0 006.294 6.294l.953-1.902a1 1 0 011.021-.523l2.328.291a1 1 0 01.79.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          Contact Information
        </h2>

        <div className="space-y-6">
          {/* Email */}
          {profile.email && (
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Email</p>
              <p className="text-base font-semibold text-gray-900 mt-2 break-all">
                {profile.email}
              </p>
            </div>
          )}

          {/* Primary Phone */}
          {primaryPhone && (
            <div className="bg-gradient-to-br from-[#40721D]/5 to-transparent p-4 rounded-lg border border-[#40721D]/10">
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">
                Primary Phone ({primaryPhone.phoneType})
              </p>
              <p className="text-lg font-bold text-[#40721D] mt-2">
                {primaryPhone.number}
              </p>
              {primaryPhone.acceptsSms && (
                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Accepts SMS messages
                </p>
              )}
            </div>
          )}

          {/* Other Phones */}
          {profile.phoneNumbers.filter((p) => !p.isPrimary).length > 0 && (
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Other Phone Numbers</p>
              <div className="space-y-2 mt-2">
                {profile.phoneNumbers
                  .filter((p) => !p.isPrimary)
                  .map((phone, idx) => (
                    <p key={idx} className="text-sm text-gray-900 font-medium">
                      {phone.number} <span className="text-gray-600">({phone.phoneType})</span>
                    </p>
                  ))}
              </div>
            </div>
          )}

          {/* Preferred Contact */}
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Preferred Contact Method</p>
            <p className="text-base font-semibold text-gray-900 mt-2 capitalize">
              {profile.preferredContact}
            </p>
          </div>
        </div>
      </div>

      {/* Address */}
      {defaultAddress && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#40721D]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Address
          </h2>

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
        <div className="rounded-xl border border-red-200 shadow-sm bg-red-50/50 p-6">
          <h2 className="text-lg font-bold text-red-900 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Allergies
          </h2>

          <div className="space-y-4">
            {profile.allergies.map((allergy, idx) => (
              <div key={idx} className="border-l-4 border-red-600 pl-4 py-2">
                <p className="font-bold text-red-900">{allergy.allergen}</p>
                {allergy.reaction && (
                  <p className="text-sm text-red-800 mt-1">
                    <span className="font-semibold">Reaction:</span> {allergy.reaction}
                  </p>
                )}
                <p className="text-sm text-red-800 mt-1">
                  <span className="font-semibold">Severity:</span>{" "}
                  <span className="font-semibold capitalize inline-block px-2 py-1 rounded mt-1 bg-red-100">
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#40721D]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            Insurance Information
          </h2>

          <div className="space-y-4">
            {primaryInsurance.thirdPartyPlan && (
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Carrier</p>
                <p className="text-base font-semibold text-gray-900 mt-2">
                  {primaryInsurance.thirdPartyPlan.planName}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Member ID</p>
              <p className="text-base font-mono font-bold text-[#40721D] mt-2">
                {primaryInsurance.memberId}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Information Note */}
      <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1h2v2H7V4zm2 4H7v2h2V8zm2-4h2v2h-2V4zm2 4h-2v2h2V8z" clipRule="evenodd" />
        </svg>
        <p className="text-sm text-blue-700 leading-relaxed">
          To update your profile information, please contact the pharmacy at (555) 123-4567 or visit us in person. We maintain accurate records to ensure your safety.
        </p>
      </div>
    </div>
  );
}
