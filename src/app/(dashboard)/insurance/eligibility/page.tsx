"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  searchPatientsForEligibility,
  getPatientInsurance,
  runEligibilityCheck,
  batchEligibilityCheck,
  getRecentChecks,
  getEligibilityStats,
} from "./actions";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  Search,
} from "lucide-react";
import { formatDateTime, formatPatientName } from "@/lib/utils/formatters";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
  insuranceCount: number;
}

interface Insurance {
  id: string;
  memberId: string;
  groupNumber: string | null;
  personCode: string | null;
  relationship: string | null;
  cardholderName: string | null;
  cardholderId: string | null;
  effectiveDate: Date | null;
  terminationDate: Date | null;
  isActive: boolean;
  priority: string;
  lastEligibilityCheck: Date | null;
  thirdPartyPlan: {
    id: string;
    planName: string;
    bin: string | null;
    pcn: string | null;
  } | null;
}

interface EligibilityResponse {
  eligible: boolean;
  copayGeneric: number;
  copayBrand: number;
  deductible: number;
  deductibleMet: number;
  coveragePercent: number;
  priorAuthRequired: boolean;
  message: string;
}

interface EligibilityResult {
  insuranceId: string;
  status: string;
  responseData: EligibilityResponse | null;
  checkedAt: Date;
}

interface Stats {
  checksToday: number;
  eligiblePercent: number;
  neverCheckedCount: number;
}

interface RecentCheck {
  id: string;
  status: string;
  responseData: EligibilityResponse | null;
  checkedAt: Date;
  checkedBy: string | null;
  insurance: {
    memberId: string;
    patient: {
      firstName: string;
      lastName: string;
    };
    thirdPartyPlan: {
      planName: string;
    } | null;
  };
}

export default function InsuranceEligibilityPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientInsurances, setPatientInsurances] = useState<Insurance[]>([]);
  const [eligibilityResult, setEligibilityResult] =
    useState<EligibilityResult | null>(null);
  const [recentChecks, setRecentChecks] = useState<RecentCheck[]>([]);
  const [stats, setStats] = useState<Stats>({
    checksToday: 0,
    eligiblePercent: 0,
    neverCheckedCount: 0,
  });

  const [searchLoading, setSearchLoading] = useState(false);
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    loadStats();
    loadRecentChecks();
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await getEligibilityStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }, []);

  const loadRecentChecks = useCallback(async () => {
    try {
      const checks = await getRecentChecks({ limit: 20 });
      setRecentChecks(checks);
    } catch (error) {
      console.error("Failed to load recent checks:", error);
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchPatientsForEligibility(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSelectPatient = useCallback(async (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery("");
    setSearchResults([]);
    setEligibilityResult(null);
    setPatientInsurances([]);

    setInsuranceLoading(true);
    try {
      const insurances = await getPatientInsurance(patient.id);
      setPatientInsurances(insurances);
    } catch (error) {
      console.error("Failed to load patient insurances:", error);
      setPatientInsurances([]);
    } finally {
      setInsuranceLoading(false);
    }
  }, []);

  const handleRunCheck = useCallback(
    async (insuranceId: string) => {
      if (!selectedPatient) return;

      setCheckLoading(true);
      try {
        const result = await runEligibilityCheck(
          selectedPatient.id,
          insuranceId
        );
        setEligibilityResult({
          insuranceId,
          status: result.status,
          responseData: result.responseData,
          checkedAt: result.checkedAt,
        });
        loadStats();
        loadRecentChecks();
      } catch (error) {
        console.error("Eligibility check failed:", error);
      } finally {
        setCheckLoading(false);
      }
    },
    [selectedPatient, loadStats, loadRecentChecks]
  );

  const handleBatchCheck = useCallback(async () => {
    setBatchLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const toCheck = patientInsurances
        .filter(
          (ins) =>
            !ins.lastEligibilityCheck ||
            new Date(ins.lastEligibilityCheck) < thirtyDaysAgo
        )
        .map((ins) => ins.id);

      if (toCheck.length === 0) {
        alert("No insurances need checking");
        return;
      }

      await batchEligibilityCheck(toCheck);
      loadStats();
      loadRecentChecks();
      if (selectedPatient) {
        const insurances = await getPatientInsurance(selectedPatient.id);
        setPatientInsurances(insurances);
      }
    } catch (error) {
      console.error("Batch check failed:", error);
    } finally {
      setBatchLoading(false);
    }
  }, [patientInsurances, selectedPatient, loadStats, loadRecentChecks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "eligible":
        return "bg-green-100 text-green-800";
      case "ineligible":
        return "bg-red-100 text-red-800";
      case "error":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "eligible":
        return <CheckCircle2 className="w-5 h-5" />;
      case "ineligible":
        return <XCircle className="w-5 h-5" />;
      case "error":
        return <AlertCircle className="w-5 h-5" />;
      case "pending":
        return <Clock className="w-5 h-5" />;
      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Insurance Eligibility Check
          </h1>
          <p className="text-gray-600">
            Verify patient insurance coverage and eligibility in real-time
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#40721D]">
                {stats.checksToday}
              </p>
              <p className="text-sm text-gray-600 mt-1">Checks Today</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#40721D]">
                {stats.eligiblePercent}%
              </p>
              <p className="text-sm text-gray-600 mt-1">Eligible</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#40721D]">
                {stats.neverCheckedCount}
              </p>
              <p className="text-sm text-gray-600 mt-1">Never Checked</p>
            </div>
          </div>
        </div>

        {/* Main Content - Two Panel Layout */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* LEFT PANEL - Patient Search & Insurance Cards */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Patient Search
              </h2>
            </div>
            <div className="p-6">
              {/* Search Input */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by name or MRN..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#40721D]" />
                </div>
              )}

              {!searchLoading && searchResults.length > 0 && (
                <div className="mb-6 space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-[#40721D] hover:bg-green-50 transition-colors"
                    >
                      <p className="font-semibold text-gray-900">
                        {formatPatientName({ firstName: patient.firstName, lastName: patient.lastName })}
                      </p>
                      <p className="text-sm text-gray-600">
                        MRN: {patient.mrn}
                      </p>
                      <p className="text-xs text-gray-500">
                        {patient.insuranceCount} insurance
                        {patient.insuranceCount !== 1 ? "s" : ""}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {!searchLoading &&
                searchQuery &&
                searchResults.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No patients found
                  </p>
                )}

              {/* Selected Patient & Insurance Cards */}
              {selectedPatient && (
                <>
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600 font-medium">
                      Selected Patient
                    </p>
                    <p className="font-semibold text-gray-900">
                      {formatPatientName({ firstName: selectedPatient.firstName, lastName: selectedPatient.lastName })}
                    </p>
                    <p className="text-sm text-gray-600">
                      DOB: {selectedPatient.dateOfBirth}
                    </p>
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="text-sm text-blue-600 hover:underline mt-2"
                    >
                      Clear Selection
                    </button>
                  </div>

                  {/* Insurance Cards */}
                  {insuranceLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-[#40721D]" />
                    </div>
                  )}

                  {!insuranceLoading && patientInsurances.length > 0 && (
                    <div className="space-y-4">
                      {patientInsurances.map((insurance) => (
                        <div
                          key={insurance.id}
                          className="p-4 border border-gray-200 rounded-lg hover:border-[#40721D] transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {insurance.thirdPartyPlan?.planName ||
                                  "Unknown Plan"}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                    insurance.isActive
                                      ? "border-green-300 bg-green-50 text-green-800"
                                      : "border-gray-300 bg-gray-50 text-gray-700"
                                  }`}
                                >
                                  {insurance.priority}
                                </span>
                                {insurance.lastEligibilityCheck && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-gray-300 bg-gray-50 text-gray-700">
                                    Checked:{" "}
                                    {formatDateTime(insurance.lastEligibilityCheck)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-sm text-gray-600 space-y-1 mb-3">
                            <p>
                              <span className="font-medium">Member ID:</span>{" "}
                              {insurance.memberId}
                            </p>
                            {insurance.groupNumber && (
                              <p>
                                <span className="font-medium">Group:</span>{" "}
                                {insurance.groupNumber}
                              </p>
                            )}
                            {insurance.cardholderName && (
                              <p>
                                <span className="font-medium">
                                  Cardholder:
                                </span>{" "}
                                {insurance.cardholderName}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleRunCheck(insurance.id)}
                            disabled={checkLoading}
                            className="w-full px-4 py-2 rounded-lg text-white font-medium bg-[#40721D] hover:bg-[#2d5115] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                          >
                            {checkLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Checking...
                              </>
                            ) : (
                              "Check Eligibility"
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!insuranceLoading &&
                    patientInsurances.length === 0 && (
                      <p className="text-center text-gray-500 py-8">
                        No insurance records found
                      </p>
                    )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT PANEL - Results Area */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Eligibility Results
              </h2>
            </div>
            <div className="p-6">
              {eligibilityResult ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${getStatusColor(eligibilityResult.status)}`}
                  >
                    {getStatusIcon(eligibilityResult.status)}
                    <div>
                      <p className="font-semibold capitalize">
                        {eligibilityResult.status}
                      </p>
                      {eligibilityResult.responseData && (
                        <p className="text-sm">
                          {eligibilityResult.responseData.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {eligibilityResult.responseData && (
                    <>
                      {/* Coverage Details Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 font-medium">
                            Copay (Generic)
                          </p>
                          <p className="text-2xl font-bold text-[#40721D]">
                            ${eligibilityResult.responseData.copayGeneric}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 font-medium">
                            Copay (Brand)
                          </p>
                          <p className="text-2xl font-bold text-[#40721D]">
                            ${eligibilityResult.responseData.copayBrand}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 font-medium">
                            Deductible
                          </p>
                          <p className="text-2xl font-bold text-[#40721D]">
                            ${eligibilityResult.responseData.deductible}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 font-medium">
                            Deductible Met
                          </p>
                          <p className="text-2xl font-bold text-[#40721D]">
                            ${eligibilityResult.responseData.deductibleMet}
                          </p>
                        </div>
                      </div>

                      {/* Coverage Percentage */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 font-medium mb-2">
                          Coverage Percentage
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-grow bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[#40721D] h-2 rounded-full"
                              style={{
                                width: `${eligibilityResult.responseData.coveragePercent}%`,
                              }}
                            />
                          </div>
                          <p className="font-semibold text-gray-900 w-12">
                            {eligibilityResult.responseData.coveragePercent}%
                          </p>
                        </div>
                      </div>

                      {/* Prior Auth Flag */}
                      {eligibilityResult.responseData.priorAuthRequired && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          <p className="text-sm text-yellow-700 font-medium">
                            Prior authorization required
                          </p>
                        </div>
                      )}

                      {/* Check Timestamp */}
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          Checked:{" "}
                          {new Date(
                            eligibilityResult.checkedAt
                          ).toLocaleString()}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-center text-gray-500">
                    Select a patient and insurance to view eligibility results
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Batch Check Section */}
        {patientInsurances.length > 0 && (
          <div className="mb-8">
            <button
              onClick={handleBatchCheck}
              disabled={batchLoading}
              className="px-4 py-2 rounded-lg text-white font-medium bg-[#40721D] hover:bg-[#2d5115] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {batchLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Batch Checking...
                </>
              ) : (
                "Batch Check (30+ Days Overdue)"
              )}
            </button>
          </div>
        )}

        {/* Recent Checks History Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Eligibility Checks
            </h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Patient
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Plan
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Member ID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentChecks.map((check) => (
                    <tr
                      key={check.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-600">
                        {formatDateTime(check.checkedAt)}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {formatPatientName({ firstName: check.insurance.patient.firstName, lastName: check.insurance.patient.lastName })}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {check.insurance.thirdPartyPlan?.planName || "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(check.status)}`}
                        >
                          {check.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {check.insurance.memberId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {recentChecks.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent checks found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
