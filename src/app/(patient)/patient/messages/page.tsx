"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  subject: string;
  message: string;
  sentAt: string;
  senderType: string;
  isRead: boolean;
}

export default function MessagesPage(): React.ReactNode {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("patient_token");

      if (!token) {
        router.push("/patient");
        return;
      }

      fetchMessages(token);
    };

    checkAuth();
  }, [router]);

  const fetchMessages = async (token: string) => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("/api/patient-portal/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();

      setMessages(data.messages);
    } catch (err) {
      setError("Failed to load messages");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!subject.trim() || !messageText.trim()) {
      setError("Please enter both subject and message");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("patient_token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch("/api/patient-portal/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          message: messageText,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send message");
      }

      setSuccessMessage("Message sent successfully!");
      setSubject("");
      setMessageText("");

      // Refresh messages
      await fetchMessages(token);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send message"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">
            Send messages to the pharmacy and view conversations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Skeleton */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="h-7 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-48 mb-6 animate-pulse"></div>
              <div className="space-y-4">
                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse"></div>
                <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse"></div>
                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* History Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="h-7 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-40 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Messages</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Send messages to the pharmacy and view conversations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Message Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#40721D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send a Message
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Subject */}
              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Subject *
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What is this about?"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] focus:ring-opacity-50 outline-none transition-all bg-white"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Message *
                </label>
                <textarea
                  id="message"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] focus:ring-opacity-50 outline-none transition-all resize-none bg-white"
                  rows={6}
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-[#40721D] text-white text-sm font-semibold rounded-lg hover:bg-[#2D5114] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-6"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </form>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50/50 border border-blue-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1h2v2H7V4zm2 4H7v2h2V8zm2-4h2v2h-2V4zm2 4h-2v2h2V8z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed">
                Our pharmacy team typically responds to messages within 24 business hours. For urgent matters, please call us at (555) 123-4567.
              </p>
            </div>
          </div>
        </div>

        {/* Message History */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#40721D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Conversation
            </h2>

            {messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 border rounded-lg transition-all duration-200 ${
                      msg.isRead
                        ? "border-gray-200 bg-white hover:bg-gray-50"
                        : "border-[#40721D]/30 bg-gradient-to-br from-[#40721D]/5 to-transparent hover:from-[#40721D]/10"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {msg.subject}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(msg.sentAt).toLocaleDateString()}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                        msg.senderType === "patient"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-[#40721D]/10 text-[#40721D]"
                      }`}
                    >
                      {msg.senderType === "patient"
                        ? "You"
                        : "Pharmacy"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-25 rounded-lg border border-gray-100">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-600 font-medium">No messages yet</p>
                <p className="text-xs text-gray-500 mt-1">Start a conversation with the pharmacy</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
