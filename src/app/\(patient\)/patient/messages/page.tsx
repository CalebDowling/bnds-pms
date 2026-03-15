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
      <div className="text-center py-12">
        <p className="text-gray-600">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Messages</h1>
        <p className="text-gray-600">
          Send messages to the pharmacy and view conversations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Message Form */}
        <div className="lg:col-span-2">
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Send a Message
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition resize-none"
                  rows={6}
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </form>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                Our pharmacy team typically responds to messages within 24
                business hours. For urgent matters, please call us at (555)
                123-4567.
              </p>
            </div>
          </div>
        </div>

        {/* Message History */}
        <div className="lg:col-span-1">
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Message History
            </h2>

            {messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 border rounded-lg ${
                      msg.isRead
                        ? "border-gray-200 bg-white"
                        : "border-[#40721D] bg-green-50"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {msg.subject}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(msg.sentAt).toLocaleDateString()}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded mt-2 ${
                        msg.senderType === "patient"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
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
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  No messages yet. Start a conversation!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
