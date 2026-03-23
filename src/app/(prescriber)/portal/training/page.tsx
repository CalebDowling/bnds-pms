"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: string[];
}

const TRAINING_MODULES: TrainingModule[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "How to log in, navigate the portal, update your profile",
    icon: "🚀",
    steps: [
      "Log in using your prescriber credentials at the portal login page",
      "Familiarize yourself with the main navigation menu on the left sidebar",
      "Access your profile settings by clicking your name in the top right corner",
      "Update your contact information and communication preferences",
      "Set up your notification settings for order updates",
      "Explore the dashboard to see your recent orders and account overview",
    ],
  },
  {
    id: "submitting-orders",
    title: "Submitting Orders",
    description: "How to submit a new compound prescription, select formulas, patient info",
    icon: "📝",
    steps: [
      "Click 'New Order' from the orders page or dashboard",
      "Enter the patient's basic information (name, date of birth, contact details)",
      "Select the medication and strength needed for the prescription",
      "Choose the appropriate formula and dosage form from available options",
      "Specify quantity, days supply, and number of refills",
      "Add directions for use (SIG) and any special compounding requests",
      "Review all details and submit the prescription order",
      "You'll receive a confirmation number and estimated completion time",
    ],
  },
  {
    id: "managing-patients",
    title: "Managing Patients",
    description: "How to view patient list, check order history, request refills",
    icon: "👥",
    steps: [
      "Navigate to the 'Patients' section from the main menu",
      "View your complete patient list with contact information",
      "Click on any patient to see their full order history",
      "Check previous prescriptions and refill availability",
      "Request refills directly from a patient's profile or order detail page",
      "Add notes or special instructions to patient records",
      "Track pending refills and manage patient communication preferences",
      "Export patient lists for your records if needed",
    ],
  },
  {
    id: "billing-payments",
    title: "Billing & Payments",
    description: "How to view account balance, payment methods, invoice history",
    icon: "💰",
    steps: [
      "Access the 'Billing' section from your account settings",
      "View your current account balance and payment status",
      "Review your invoice history with detailed breakdown of charges",
      "Add or update payment methods in your account",
      "Set up automatic payments for recurring orders if available",
      "Download invoices and receipts for accounting purposes",
      "Check billing discounts and promotional offers",
      "Contact billing support for any payment-related questions",
    ],
  },
  {
    id: "messaging",
    title: "Messaging",
    description: "How to communicate with pharmacy staff, check message status",
    icon: "💬",
    steps: [
      "Open the 'Messages' section from the main navigation",
      "View all conversations with pharmacy staff and support team",
      "Send a new message by clicking 'New Message' and selecting a recipient",
      "Attach files or documentation to your messages if needed",
      "Check message status (delivered, read, etc.) at a glance",
      "Set message priority levels for urgent communications",
      "Archive or delete conversations as needed",
      "Enable notifications for new messages from pharmacy staff",
    ],
  },
  {
    id: "faqs",
    title: "FAQs",
    description: "Common questions about turnaround times, shipping, compounding process",
    icon: "❓",
    steps: [
      "Standard turnaround times: Normal priority is 3-5 business days",
      "Urgent orders are typically completed within 1-2 business days",
      "Stat orders (same-day or next-day) require special approval and additional fees",
      "Shipping typically begins within 24 hours of order completion",
      "All orders are prepared using USP-certified compounding standards",
      "Compounds are tested for stability and sterility before dispensing",
      "Contact us if you have special instructions for custom formulations",
      "Returns and replacements are handled on a case-by-case basis",
    ],
  },
];

export default function TrainingPage(): React.ReactNode {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );
  const [completedModules, setCompletedModules] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage
    const savedExpanded = localStorage.getItem("training_expanded");
    const savedCompleted = localStorage.getItem("training_completed");

    if (savedExpanded) {
      try {
        setExpandedModules(new Set(JSON.parse(savedExpanded)));
      } catch {
        setExpandedModules(new Set());
      }
    }

    if (savedCompleted) {
      try {
        setCompletedModules(new Set(JSON.parse(savedCompleted)));
      } catch {
        setCompletedModules(new Set());
      }
    }

    setIsLoading(false);
  }, []);

  const toggleExpanded = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
      // Mark as completed when expanded
      const newCompleted = new Set(completedModules);
      newCompleted.add(moduleId);
      setCompletedModules(newCompleted);
      localStorage.setItem("training_completed", JSON.stringify([...newCompleted]));
    }
    setExpandedModules(newExpanded);
    localStorage.setItem("training_expanded", JSON.stringify([...newExpanded]));
  };

  const progressPercentage = Math.round(
    (completedModules.size / TRAINING_MODULES.length) * 100
  );

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
        .stagger-4 { animation: fadeUp 0.3s ease-out 0.2s both; }
        .stagger-5 { animation: fadeUp 0.3s ease-out 0.25s both; }
        .stagger-6 { animation: fadeUp 0.3s ease-out 0.3s both; }
        .card-lift { transition: all 0.2s ease-out; }
        .card-lift:hover { transform: translateY(-2px); }
      `}</style>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#40721D]/5 to-transparent rounded-2xl border border-gray-100 p-8 mb-8 stagger-1">
        <h1 className="text-[18px] font-semibold text-gray-900 mb-2">
          Welcome to Boudreaux's Prescriber Training
        </h1>
        <p className="text-[13px] text-gray-600 mb-4">
          Master the portal with our comprehensive training modules. Expand each section to learn step-by-step instructions for managing your prescriptions, orders, and account.
        </p>
        <p className="text-[13px] text-gray-600">
          Each module takes just 5-10 minutes to complete. Track your progress below.
        </p>
      </div>

      {/* Progress Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 stagger-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold text-gray-900">Your Progress</h2>
          <span className="text-[15px] font-semibold text-[#40721D]">
            {completedModules.size}/{TRAINING_MODULES.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-[#40721D] h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <p className="text-[12px] text-gray-400 mt-3">
          {progressPercentage}% Complete • {TRAINING_MODULES.length - completedModules.size}{" "}
          modules remaining
        </p>
      </div>

      {/* Training Modules */}
      {!isLoading && (
        <div className="space-y-4">
          {TRAINING_MODULES.map((module, idx) => {
            const isExpanded = expandedModules.has(module.id);
            const isCompleted = completedModules.has(module.id);
            const staggerClass = [
              "stagger-1",
              "stagger-2",
              "stagger-3",
              "stagger-4",
              "stagger-5",
              "stagger-6",
            ][idx % 6];

            return (
              <div
                key={module.id}
                className={`bg-white rounded-2xl border border-gray-100 overflow-hidden card-lift ${staggerClass}`}
              >
                {/* Module Header */}
                <button
                  onClick={() => toggleExpanded(module.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 text-left">
                    <span className="text-2xl">{module.icon}</span>
                    <div>
                      <h3 className="text-[13px] font-semibold text-gray-900">
                        {module.title}
                      </h3>
                      <p className="text-[12px] text-gray-400 mt-0.5">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {isCompleted && (
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-[#40721D] rounded-full text-white text-[11px] font-semibold">
                        ✓
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Module Content */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <ol className="space-y-3">
                      {module.steps.map((step, stepIdx) => (
                        <li key={stepIdx} className="flex gap-3">
                          <span className="text-[13px] font-semibold text-[#40721D] flex-shrink-0 w-5 text-center">
                            {stepIdx + 1}.
                          </span>
                          <span className="text-[13px] text-gray-700 leading-relaxed">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-2xl stagger-3">
        <p className="text-[13px] text-blue-700">
          💡 <span className="font-semibold">Tip:</span> Expand each module to view step-by-step instructions. Your progress is automatically saved as you explore.
        </p>
      </div>
    </div>
  );
}
