"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface ModuleContent {
  id: string;
  title: string;
  description: string;
  category: string;
  sections: {
    title: string;
    steps: string[];
  }[];
}

// Hardcoded module content
const MODULE_CONTENT: Record<string, ModuleContent> = {
  "getting-started-1": {
    id: "getting-started-1",
    title: "Welcome to Boudreaux's Prescriber Portal",
    description:
      "Introduction to the portal, account setup, and navigation basics.",
    category: "Getting Started",
    sections: [
      {
        title: "Portal Overview",
        steps: [
          "The Prescriber Portal is your direct connection to Boudreaux's compounding pharmacy services",
          "Access real-time order status, refill management, and communication tools",
          "Manage billing, training resources, and account settings all in one place",
          "The portal is available 24/7 from any device with internet access",
        ],
      },
      {
        title: "Getting Started",
        steps: [
          "Log in with your NPI number and last name",
          "Complete your profile setup in Account Settings",
          "Review the Dashboard to see key metrics and recent activity",
          "Bookmark the portal URL for quick access",
        ],
      },
      {
        title: "Next Steps",
        steps: [
          "Explore the Orders section to view and create new orders",
          "Check out the Refills section to manage prescription refills",
          "Set up your communication preferences in Messages",
          "Review the Billing section to understand your account balance",
        ],
      },
    ],
  },
  "getting-started-2": {
    id: "getting-started-2",
    title: "Understanding Your Dashboard",
    description:
      "Learn how to interpret dashboard metrics and key performance indicators.",
    category: "Getting Started",
    sections: [
      {
        title: "Dashboard Components",
        steps: [
          "Key Metrics: Total Orders, Pending Orders, and Refill Requests",
          "Recent Activity: Your latest 10 orders and interactions",
          "Quick Links: Fast access to common actions like New Order",
          "Status Summary: Overview of all your prescriptions",
        ],
      },
      {
        title: "Using Dashboard Data",
        steps: [
          "Monitor total orders placed this month",
          "Track pending orders that require your attention",
          "Review refill requests that need to be processed",
          "Identify trends in your ordering patterns",
        ],
      },
      {
        title: "Dashboard Updates",
        steps: [
          "Dashboard data refreshes every few minutes",
          "Click the Refresh button to get the latest data",
          "Set up email alerts for important updates in Settings",
          "Use filters to customize your dashboard view",
        ],
      },
    ],
  },
  "ordering-1": {
    id: "ordering-1",
    title: "Creating Your First Order",
    description:
      "Step-by-step guide to placing an order with Boudreaux's pharmacy.",
    category: "Ordering",
    sections: [
      {
        title: "Order Basics",
        steps: [
          "Orders contain one or more prescription items from your patients",
          "Each order must include a patient, medication, and quantity",
          "Special compounding requests can be added to any order",
          "Orders are processed within 24 hours of submission",
        ],
      },
      {
        title: "Creating an Order",
        steps: [
          "Click 'New Order' in the top navigation or sidebar",
          "Select the patient from your patient list",
          "Choose the medication and enter the desired quantity",
          "Add any special instructions or compounding requests",
          "Review the order summary and click Submit",
        ],
      },
      {
        title: "Order Confirmation",
        steps: [
          "You'll receive an order confirmation immediately",
          "A pharmacy technician will review your order within 2 hours",
          "You'll be notified when your order is ready for pickup",
          "Track all order status updates in the Orders section",
        ],
      },
    ],
  },
  "ordering-2": {
    id: "ordering-2",
    title: "Managing Bulk Orders",
    description:
      "Learn efficient techniques for managing large volume orders.",
    category: "Ordering",
    sections: [
      {
        title: "Bulk Order Setup",
        steps: [
          "Bulk orders allow you to submit multiple items at once",
          "Upload a CSV file with patient names, medications, and quantities",
          "The system validates all entries before submission",
          "Estimated processing time for bulk orders is 24-48 hours",
        ],
      },
      {
        title: "CSV Format",
        steps: [
          "Required columns: Patient Name, Medication, Quantity",
          "Optional columns: Special Instructions, Compounding Notes",
          "Ensure no special characters in patient names",
          "Save your file as .csv before uploading",
        ],
      },
      {
        title: "Processing Bulk Orders",
        steps: [
          "Review your CSV file for accuracy before uploading",
          "Upload the file using the Bulk Order tool",
          "You'll receive a confirmation with order ID",
          "Track bulk order progress in your Orders dashboard",
        ],
      },
    ],
  },
  "compounding-1": {
    id: "compounding-1",
    title: "Compounding Basics for Prescribers",
    description:
      "Overview of pharmaceutical compounding and customization options available.",
    category: "Compounding Basics",
    sections: [
      {
        title: "What is Compounding?",
        steps: [
          "Compounding is the creation of customized medications for individual patients",
          "Medications are prepared specifically to meet unique patient needs",
          "Boudreaux's has state-of-the-art compounding capabilities",
          "All compounds are prepared under strict quality standards",
        ],
      },
      {
        title: "Available Customizations",
        steps: [
          "Flavoring: Add fruit, chocolate, or vanilla flavors to medications",
          "Dosage Forms: Capsules, tablets, liquids, creams, and more",
          "Strength Adjustments: Customize dose strengths per patient",
          "Allergen-Free Options: Remove common allergens like lactose or dyes",
        ],
      },
      {
        title: "When to Use Compounding",
        steps: [
          "Patient is unable to swallow standard tablets or capsules",
          "Specific dose is not available in commercial products",
          "Patient has allergies to commercial formulation ingredients",
          "Combination medications improve patient compliance",
        ],
      },
    ],
  },
  "compounding-2": {
    id: "compounding-2",
    title: "Special Formulations and Flavoring",
    description:
      "Explore custom formulations, flavoring options, and specialty compounds.",
    category: "Compounding Basics",
    sections: [
      {
        title: "Flavoring Options",
        steps: [
          "Cherry: Sweet, mild flavor - ideal for children",
          "Grape: Bold, fruity taste - popular for difficult patients",
          "Bubble Gum: Fun flavor option for pediatric compounds",
          "Tropical: Combination of tropical fruits",
          "Unflavored: For patients with flavor sensitivities",
        ],
      },
      {
        title: "Specialty Forms",
        steps: [
          "Capsules: For patients who can swallow but prefer capsules",
          "Liquids: Easy to dose and customize for pediatric patients",
          "Topical Creams: Custom-compounded creams for skin conditions",
          "Suspensions: For medications that need to be taken in liquid form",
        ],
      },
      {
        title: "Requesting Special Formulations",
        steps: [
          "Include your specific request when placing the order",
          "Our pharmacist will contact you if clarification is needed",
          "Pricing may vary based on complexity of the formulation",
          "Standard delivery time is 24-48 hours",
        ],
      },
    ],
  },
  "veterinary-1": {
    id: "veterinary-1",
    title: "Veterinary Compounding Overview",
    description:
      "Introduction to veterinary pharmacy services and compounding for animals.",
    category: "Veterinary",
    sections: [
      {
        title: "Veterinary Services",
        steps: [
          "Boudreaux's compounds medications for companion animals and exotic pets",
          "Common veterinary compounds include antibiotics, pain management, and behavior medications",
          "Flavoring options are especially important for pets who refuse medications",
          "Our veterinary pharmacist team has years of experience with animal pharmaceuticals",
        ],
      },
      {
        title: "Pet-Friendly Formulations",
        steps: [
          "Meat Flavoring: Chicken, beef, and fish flavors for oral medications",
          "Small Doses: Precise dosing for small pets and exotic animals",
          "Easy Administration: Liquid or paste forms for difficult-to-dose pets",
          "Allergy Considerations: Custom formulations for pets with sensitivities",
        ],
      },
      {
        title: "Ordering for Pets",
        steps: [
          "Select 'Veterinary' as the medication type when placing an order",
          "Include the pet's species and weight in special instructions",
          "Specify the animal's preferred flavor or administration method",
          "Our veterinary specialist will ensure proper formulation and dosing",
        ],
      },
    ],
  },
  "billing-1": {
    id: "billing-1",
    title: "Understanding Your Billing & Insurance",
    description:
      "Overview of billing cycles, insurance processing, and payment options.",
    category: "Billing & Insurance",
    sections: [
      {
        title: "Billing Overview",
        steps: [
          "Invoices are generated upon order completion",
          "Payment terms are typically Net 30 from invoice date",
          "Multiple payment methods are available including ACH and credit card",
          "Your account statement is available anytime in the Billing section",
        ],
      },
      {
        title: "Insurance Verification",
        steps: [
          "We verify insurance coverage before processing orders when possible",
          "Insurance information is requested at order time if needed",
          "Coverage determinations may affect final billing amounts",
          "Insurance pre-authorizations are handled by our billing team",
        ],
      },
      {
        title: "Late Payment Processing",
        steps: [
          "Invoices are marked Pending when first issued",
          "Overdue status appears 30+ days past invoice date",
          "Collection calls may be placed for significantly overdue invoices",
          "Payment plans are available upon request",
        ],
      },
    ],
  },
  "billing-2": {
    id: "billing-2",
    title: "Invoicing and Payment Processing",
    description:
      "How to manage invoices, payment methods, and resolve billing issues.",
    category: "Billing & Insurance",
    sections: [
      {
        title: "Invoice Details",
        steps: [
          "Each invoice includes: Invoice number, date, patient name, medication, and amount",
          "Download PDF invoices directly from the Billing section",
          "Invoices show itemized charges and any applicable discounts",
          "Tax information is included when applicable",
        ],
      },
      {
        title: "Making Payments",
        steps: [
          "Use the 'Pay Now' button next to pending or overdue invoices",
          "Choose your payment method: ACH Bank Transfer or Credit Card",
          "Payments are processed immediately upon submission",
          "You'll receive a payment confirmation email",
        ],
      },
      {
        title: "Payment Support",
        steps: [
          "Contact our billing team for payment plan options",
          "Dispute resolution process is available for invoice questions",
          "Auto-pay can be set up in Account Settings for recurring invoices",
          "Tax documents (1099s) are issued annually in January",
        ],
      },
    ],
  },
  "ordering-3": {
    id: "ordering-3",
    title: "Order Tracking and Status Updates",
    description:
      "Monitor your orders in real-time and receive status notifications.",
    category: "Ordering",
    sections: [
      {
        title: "Order Status Tracking",
        steps: [
          "View all your orders in the Orders section with real-time status",
          "Status progression: Submitted → Processing → Ready → Picked Up",
          "Click any order to see detailed information and history",
          "Track estimated pickup dates for each order",
        ],
      },
      {
        title: "Status Notifications",
        steps: [
          "Email notifications are sent when order status changes",
          "SMS notifications can be enabled in Account Settings",
          "Notifications are sent when: Order is Processing, Order is Ready, Order is Completed",
          "Customize notification preferences based on your needs",
        ],
      },
      {
        title: "Communication Support",
        steps: [
          "Use Messages to communicate with the pharmacy about specific orders",
          "Tag orders with custom notes for reference",
          "Request order modifications while still in Processing status",
          "Schedule pickup times in advance for convenience",
        ],
      },
    ],
  },
};

export default function TrainingModulePage(): React.ReactNode {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;

  const [isCompleted, setIsCompleted] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const content = MODULE_CONTENT[moduleId];

  useEffect(() => {
    if (content) {
      const savedModules = localStorage.getItem("training_modules");
      if (savedModules) {
        try {
          const modules = JSON.parse(savedModules);
          const module = modules.find(
            (m: { id: string }) => m.id === moduleId
          );
          if (module) {
            setIsCompleted(module.completed);
          }
        } catch {
          // Ignore parse error
        }
      }
    }
  }, [moduleId, content]);

  const handleMarkComplete = async () => {
    setIsMarking(true);
    try {
      // Update localStorage
      const savedModules = localStorage.getItem("training_modules");
      if (savedModules) {
        const modules = JSON.parse(savedModules);
        const moduleIndex = modules.findIndex(
          (m: { id: string }) => m.id === moduleId
        );
        if (moduleIndex !== -1) {
          modules[moduleIndex].completed = true;
          localStorage.setItem("training_modules", JSON.stringify(modules));
        }
      }
      setIsCompleted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsMarking(false);
    }
  };

  if (!content) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Module Not Found
        </h1>
        <p className="text-gray-600 mb-6">
          The training module you're looking for doesn't exist.
        </p>
        <Link
          href="/portal/training"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors"
        >
          ← Back to Training
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/portal/training"
          className="inline-flex items-center gap-2 text-[#40721D] font-medium text-sm mb-4 hover:text-[#2D5114]"
        >
          ← Back to Training
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">
              {content.category}
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              {content.title}
            </h1>
            <p className="text-gray-600 mt-2">{content.description}</p>
          </div>
          {isCompleted && (
            <span className="inline-flex items-center justify-center w-10 h-10 bg-green-500 rounded-full text-white text-lg flex-shrink-0">
              ✓
            </span>
          )}
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
            {content.sections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-[#40721D]/10 text-[#40721D] text-sm font-bold rounded-full">
                    {sectionIdx + 1}
                  </span>
                  {section.title}
                </h2>

                <ol className="space-y-3">
                  {section.steps.map((step, stepIdx) => (
                    <li
                      key={stepIdx}
                      className="flex gap-3 text-gray-700 text-sm"
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-gray-400 rounded-full flex-shrink-0 mt-0.5">
                        {stepIdx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
            {/* Completion Status */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">
                Completion Status
              </h3>
              <div
                className={`p-4 rounded-lg text-center ${
                  isCompleted
                    ? "bg-green-50 border border-green-200"
                    : "bg-yellow-50 border border-yellow-200"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    isCompleted ? "text-green-800" : "text-yellow-800"
                  }`}
                >
                  {isCompleted
                    ? "✓ Completed"
                    : "In Progress"}
                </p>
              </div>
            </div>

            {/* Action Button */}
            {!isCompleted && (
              <button
                onClick={handleMarkComplete}
                disabled={isMarking}
                className="w-full px-4 py-2.5 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
              >
                {isMarking ? "Marking..." : "Mark as Complete"}
              </button>
            )}

            {/* Learning Points */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">
                What You'll Learn
              </h3>
              <ul className="space-y-2 text-xs text-gray-600">
                {content.sections.map((section, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-[#40721D] flex-shrink-0">→</span>
                    <span>{section.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 Questions? Contact support@boudreauxs.com
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="mt-8 flex gap-3">
        <Link
          href="/portal/training"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          ← Back to Training
        </Link>
      </div>
    </div>
  );
}
