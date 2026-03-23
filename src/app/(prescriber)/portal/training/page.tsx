"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: "Getting Started" | "Ordering" | "Compounding Basics" | "Veterinary" | "Billing & Insurance";
  completed: boolean;
}

const TRAINING_MODULES: TrainingModule[] = [
  {
    id: "getting-started-1",
    title: "Welcome to Boudreaux's Prescriber Portal",
    description: "Introduction to the portal, account setup, and navigation basics.",
    duration: "5 min",
    category: "Getting Started",
    completed: false,
  },
  {
    id: "getting-started-2",
    title: "Understanding Your Dashboard",
    description: "Learn how to interpret dashboard metrics and key performance indicators.",
    duration: "8 min",
    category: "Getting Started",
    completed: false,
  },
  {
    id: "ordering-1",
    title: "Creating Your First Order",
    description: "Step-by-step guide to placing an order with Boudreaux's pharmacy.",
    duration: "10 min",
    category: "Ordering",
    completed: false,
  },
  {
    id: "ordering-2",
    title: "Managing Bulk Orders",
    description: "Learn efficient techniques for managing large volume orders.",
    duration: "12 min",
    category: "Ordering",
    completed: false,
  },
  {
    id: "compounding-1",
    title: "Compounding Basics for Prescribers",
    description: "Overview of pharmaceutical compounding and customization options available.",
    duration: "15 min",
    category: "Compounding Basics",
    completed: false,
  },
  {
    id: "compounding-2",
    title: "Special Formulations and Flavoring",
    description: "Explore custom formulations, flavoring options, and specialty compounds.",
    duration: "12 min",
    category: "Compounding Basics",
    completed: false,
  },
  {
    id: "veterinary-1",
    title: "Veterinary Compounding Overview",
    description: "Introduction to veterinary pharmacy services and compounding for animals.",
    duration: "10 min",
    category: "Veterinary",
    completed: false,
  },
  {
    id: "billing-1",
    title: "Understanding Your Billing & Insurance",
    description: "Overview of billing cycles, insurance processing, and payment options.",
    duration: "14 min",
    category: "Billing & Insurance",
    completed: false,
  },
  {
    id: "billing-2",
    title: "Invoicing and Payment Processing",
    description: "How to manage invoices, payment methods, and resolve billing issues.",
    duration: "11 min",
    category: "Billing & Insurance",
    completed: false,
  },
  {
    id: "ordering-3",
    title: "Order Tracking and Status Updates",
    description: "Monitor your orders in real-time and receive status notifications.",
    duration: "7 min",
    category: "Ordering",
    completed: false,
  },
];

export default function TrainingPage(): React.ReactNode {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem("training_modules");
    if (saved) {
      try {
        const savedModules = JSON.parse(saved);
        setModules(savedModules);
      } catch {
        setModules(TRAINING_MODULES);
      }
    } else {
      setModules(TRAINING_MODULES);
    }
    setIsLoading(false);
  }, []);

  const filteredModules =
    selectedCategory === "all"
      ? modules
      : modules.filter((m) => m.category === selectedCategory);

  const completedCount = modules.filter((m) => m.completed).length;
  const progressPercentage = Math.round(
    (completedCount / modules.length) * 100
  );

  const categories = [
    "all",
    "Getting Started",
    "Ordering",
    "Compounding Basics",
    "Veterinary",
    "Billing & Insurance",
  ];

  const categoryIcons: Record<string, string> = {
    "Getting Started": "🚀",
    Ordering: "📝",
    "Compounding Basics": "🧪",
    Veterinary: "🐾",
    "Billing & Insurance": "💰",
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
        .card-lift { transition: all 0.2s ease-out; }
        .card-lift:hover { transform: translateY(-2px); }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 stagger-1">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900">Training Modules</h1>
          <p className="text-[13px] text-gray-600 mt-1">
            Learn how to use the Boudreaux's prescriber portal effectively
          </p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 stagger-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold text-gray-900">Your Progress</h2>
          <span className="text-xl font-semibold text-[#40721D]">
            {completedCount}/{modules.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#40721D] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <p className="text-[12px] text-gray-600 mt-2">
          {progressPercentage}% Complete • {modules.length - completedCount}{" "}
          modules remaining
        </p>
      </div>

      {/* Category Filter */}
      <div className="mb-6 stagger-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-[13px] font-semibold rounded-xl whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-[#40721D] text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat === "all" ? "All Modules" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-[13px]">Loading training modules...</p>
        </div>
      ) : (
        /* Module Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-3">
          {filteredModules.map((module) => (
            <Link
              key={module.id}
              href={`/portal/training/${module.id}`}
              className="bg-white rounded-2xl border border-gray-100 p-5 card-lift group hover:border-gray-200"
            >
              {/* Category Icon and Badge */}
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">
                  {categoryIcons[module.category] || "📚"}
                </span>
                {module.completed && (
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-500 rounded-full text-white text-[11px] font-semibold">
                    ✓
                  </span>
                )}
              </div>

              {/* Content */}
              <h3 className="font-semibold text-gray-900 text-[13px] mb-2 group-hover:text-[#40721D] transition-colors">
                {module.title}
              </h3>
              <p className="text-[12px] text-gray-600 mb-4 line-clamp-2">
                {module.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                  <span>⏱️</span>
                  <span>{module.duration}</span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-1 bg-gray-100 text-gray-700 rounded-lg">
                  {module.category}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredModules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-[13px]">
            No modules found in this category
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-[13px] text-blue-700">
          💡 Complete all training modules to become a power user of the
          Boudreaux's prescriber portal. Modules typically take 5-15 minutes
          each.
        </p>
      </div>
    </div>
  );
}
