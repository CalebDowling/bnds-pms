"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  searchDrugs,
  searchPatients,
  getPatientMedProfile,
  checkInteractions,
  type DrugOption,
  type PatientMedProfile,
} from "./actions";
import { formatDrugName, toTitleCase } from "@/lib/utils/formatters";

type Interaction = {
  drugA: string;
  drugB: string;
  severity: "major" | "moderate" | "minor";
  description: string;
  clinicalEffect: string;
  management: string;
};

const SEVERITY_STYLES = {
  major: {
    bg: "bg-red-50",
    border: "border-red-300",
    badge: "bg-red-600 text-white",
    icon: "⚠️",
    label: "MAJOR",
  },
  moderate: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    badge: "bg-amber-500 text-white",
    icon: "⚡",
    label: "MODERATE",
  },
  minor: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    badge: "bg-blue-500 text-white",
    icon: "ℹ️",
    label: "MINOR",
  },
};

export default function InteractionCheckerPage() {
  const [drugList, setDrugList] = useState<string[]>([]);
  const [drugSearch, setDrugSearch] = useState("");
  const [drugResults, setDrugResults] = useState<DrugOption[]>([]);
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);

  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; name: string; mrn: string }[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [patientProfile, setPatientProfile] = useState<PatientMedProfile | null>(null);

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [checkedDrugs, setCheckedDrugs] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const drugInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Drug search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (drugSearch.length < 2) {
      setDrugResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await searchDrugs(drugSearch);
      setDrugResults(results);
      setShowDrugDropdown(true);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [drugSearch]);

  // Patient search
  const searchPatientsDebounced = useCallback(async (q: string) => {
    if (q.length < 2) { setPatientResults([]); return; }
    const results = await searchPatients(q);
    setPatientResults(results);
    setShowPatientDropdown(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchPatientsDebounced(patientSearch), 200);
    return () => clearTimeout(t);
  }, [patientSearch, searchPatientsDebounced]);

  function addDrug(name: string) {
    const normalized = name.trim();
    if (!normalized || drugList.includes(normalized)) return;
    setDrugList((prev) => [...prev, normalized]);
    setDrugSearch("");
    setShowDrugDropdown(false);
    setHasChecked(false);
    drugInputRef.current?.focus();
  }

  function removeDrug(index: number) {
    setDrugList((prev) => prev.filter((_, i) => i !== index));
    setHasChecked(false);
  }

  async function loadPatientProfile(patientId: string) {
    const profile = await getPatientMedProfile(patientId);
    setPatientProfile(profile);
    setShowPatientDropdown(false);
    setPatientSearch("");

    if (profile) {
      // Add patient's active meds to the drug list
      const newDrugs = profile.medications
        .map((m) => m.genericName || m.drugName)
        .filter((d) => !drugList.includes(d));
      setDrugList((prev) => [...prev, ...newDrugs]);
      setHasChecked(false);
    }
  }

  async function handleCheck() {
    if (drugList.length < 2) return;
    setChecking(true);
    try {
      const result = await checkInteractions(drugList);
      setInteractions(result.interactions);
      setCheckedDrugs(result.checkedDrugs);
      setHasChecked(true);
    } catch (err) {
      console.error("Interaction check failed:", err);
    } finally {
      setChecking(false);
    }
  }

  function clearAll() {
    setDrugList([]);
    setInteractions([]);
    setCheckedDrugs([]);
    setHasChecked(false);
    setPatientProfile(null);
  }

  const majorCount = interactions.filter((i) => i.severity === "major").length;
  const moderateCount = interactions.filter((i) => i.severity === "moderate").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drug Interaction Checker</h1>
          <p className="text-sm text-gray-500 mt-1">
            Check for interactions between medications
          </p>
        </div>
        <button
          onClick={clearAll}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Drug Input */}
        <div className="lg:col-span-1">
          {/* Load Patient Meds */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Load Patient Medications</h3>
            <div className="relative">
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                onFocus={() => patientResults.length > 0 && setShowPatientDropdown(true)}
                placeholder="Search patient by name or MRN..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
              />
              {showPatientDropdown && patientResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => loadPatientProfile(p.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <span className="font-medium text-gray-900">{toTitleCase(p.name)}</span>
                      <span className="text-xs text-gray-400 ml-2">{p.mrn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {patientProfile && (
              <div className="mt-2 px-2 py-1.5 bg-green-50 rounded text-xs text-green-700">
                Loaded {patientProfile.medications.length} active meds for{" "}
                <span className="font-medium">{toTitleCase(patientProfile.patientName)}</span>
              </div>
            )}
          </div>

          {/* Add Drugs */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Medications to Check
              <span className="ml-1 text-xs font-normal text-gray-400">
                ({drugList.length} drug{drugList.length !== 1 ? "s" : ""})
              </span>
            </h3>

            <div className="relative mb-3">
              <input
                ref={drugInputRef}
                type="text"
                value={drugSearch}
                onChange={(e) => setDrugSearch(e.target.value)}
                onFocus={() => drugResults.length > 0 && setShowDrugDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && drugSearch.trim()) {
                    e.preventDefault();
                    addDrug(drugSearch);
                  }
                }}
                placeholder="Type drug name or search..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
              />
              {showDrugDropdown && drugResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {drugResults.map((drug) => (
                    <button
                      key={drug.id}
                      onClick={() => addDrug(drug.genericName || drug.name)}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-900">{formatDrugName(drug.name)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {drug.genericName && (
                          <span className="text-xs text-gray-500">{formatDrugName(drug.genericName)}</span>
                        )}
                        {drug.strength && (
                          <span className="text-xs text-gray-400">{drug.strength}</span>
                        )}
                        {drug.dosageForm && (
                          <span className="text-xs text-gray-400">{drug.dosageForm}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Drug List */}
            {drugList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Add at least 2 drugs to check interactions
              </p>
            ) : (
              <div className="space-y-1.5">
                {drugList.map((drug, i) => (
                  <div
                    key={`${drug}-${i}`}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-900">{drug}</span>
                    <button
                      onClick={() => removeDrug(i)}
                      className="text-gray-400 hover:text-red-500 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Check Button */}
          <button
            onClick={handleCheck}
            disabled={drugList.length < 2 || checking}
            className="w-full py-3 bg-[#40721D] text-white font-semibold rounded-xl hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {checking
              ? "Checking..."
              : `Check Interactions${drugList.length >= 2 ? ` (${drugList.length} drugs)` : ""}`}
          </button>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2">
          {!hasChecked ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-4xl mb-3">💊</p>
              <p className="text-sm text-gray-500">
                Add medications and click &quot;Check Interactions&quot; to see results
              </p>
              <p className="text-xs text-gray-400 mt-1">
                You can load a patient&apos;s active medications or add drugs manually
              </p>
            </div>
          ) : (
            <div>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div
                  className={`rounded-xl border p-3 ${
                    majorCount > 0
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-400 uppercase">Major</p>
                  <p className={`text-2xl font-bold ${majorCount > 0 ? "text-red-600" : "text-gray-300"}`}>
                    {majorCount}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-3 ${
                    moderateCount > 0
                      ? "border-amber-300 bg-amber-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-400 uppercase">Moderate</p>
                  <p className={`text-2xl font-bold ${moderateCount > 0 ? "text-amber-600" : "text-gray-300"}`}>
                    {moderateCount}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Drugs Checked</p>
                  <p className="text-2xl font-bold text-gray-900">{checkedDrugs.length}</p>
                </div>
              </div>

              {/* No Interactions */}
              {interactions.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="text-sm font-semibold text-green-700">
                    No known interactions found
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    Between the {checkedDrugs.length} medications checked
                  </p>
                </div>
              )}

              {/* Interaction Cards */}
              {interactions.length > 0 && (
                <div className="space-y-3">
                  {interactions.map((ix, i) => {
                    const style = SEVERITY_STYLES[ix.severity];
                    return (
                      <div
                        key={i}
                        className={`rounded-xl border ${style.border} ${style.bg} p-4`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{style.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${style.badge}`}
                              >
                                {style.label}
                              </span>
                              <h4 className="text-sm font-semibold text-gray-900">
                                {ix.description}
                              </h4>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">
                              <span className="font-semibold">{ix.drugA}</span>
                              {" + "}
                              <span className="font-semibold">{ix.drugB}</span>
                            </p>

                            <div className="space-y-2">
                              <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">
                                  Clinical Effect
                                </p>
                                <p className="text-sm text-gray-700">{ix.clinicalEffect}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">
                                  Management
                                </p>
                                <p className="text-sm text-gray-700">{ix.management}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Disclaimer */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  <span className="font-bold">Disclaimer:</span> This interaction checker uses a
                  built-in reference database and may not include all possible interactions.
                  Always consult clinical references (Lexicomp, Clinical Pharmacology, Micromedex)
                  for comprehensive interaction data. Clinical judgment should always be applied.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
