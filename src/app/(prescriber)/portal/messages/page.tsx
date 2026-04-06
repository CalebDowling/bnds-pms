"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  senderName: string;
  timestamp: string;
  text: string;
  isFromPharmacy: boolean;
  isRead: boolean;
}

interface Conversation {
  id: string;
  contextLabel: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  unreadCount: number;
  messages: Message[];
}

export default function MessagesPage(): React.ReactNode {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [newConvContext, setNewConvContext] = useState("General Inquiry");
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchConversations();

    // Auto-refresh every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
      setRefreshing(true);
      fetchConversations().finally(() => setRefreshing(false));
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConvId, conversations]);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("prescriber_token") : null;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await fetch("/api/prescriber-portal/messages", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      setConversations(data.conversations || []);
      if (data.conversations && data.conversations.length > 0 && !selectedConvId) {
        setSelectedConvId(data.conversations[0].id);
      }
    } catch (err) {
      setError("Error loading messages. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/prescriber-portal/messages/${conversationId}/read`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to mark as read");

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, unread: false, unreadCount: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConvId) return;

    try {
      setIsSending(true);
      const response = await fetch("/api/prescriber-portal/messages", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          conversationId: selectedConvId,
          message: messageText,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      // Clear input
      setMessageText("");

      // Refresh conversations
      await fetchConversations();
    } catch (err) {
      setError("Error sending message. Please try again.");
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      setIsSending(true);
      const response = await fetch("/api/prescriber-portal/messages", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          newConversation: true,
          pharmacyContext: newConvContext,
        }),
      });

      if (!response.ok) throw new Error("Failed to create conversation");

      setShowNewConvModal(false);
      setNewConvContext("General Inquiry");
      await fetchConversations();
    } catch (err) {
      setError("Error creating conversation. Please try again.");
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConvId
  );

  const unreadTotal = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

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
      <div className="flex items-center justify-between mb-6 stagger-1">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900">Messages</h1>
          <p className="text-[13px] text-gray-600 mt-1">
            {unreadTotal > 0 ? (
              <>Communication with pharmacy <span className="font-semibold text-[#40721D]">({unreadTotal} unread)</span></>
            ) : (
              "Communication with the pharmacy"
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchConversations().finally(() => setRefreshing(false));
            }}
            disabled={refreshing}
            className="px-3 py-2 bg-gray-100 text-gray-700 text-[13px] font-medium rounded-2xl hover:bg-gray-200 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {refreshing ? "..." : "↻"}
          </button>
          <button
            onClick={() => setShowNewConvModal(true)}
            className="px-4 py-2 bg-[#40721D] text-white text-[13px] font-semibold rounded-2xl hover:bg-[#355f1a] active:scale-[0.98] transition-all shadow-sm"
          >
            + New Message
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl stagger-2">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {/* New Conversation Modal */}
      {showNewConvModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-md w-full p-6 shadow-lg">
            <h2 className="text-[15px] font-semibold text-gray-900 mb-2">
              Start New Conversation
            </h2>
            <p className="text-[13px] text-gray-600 mb-4">
              Start a new message with the pharmacy about your prescriptions or questions.
            </p>
            <div className="space-y-3 mb-4">
              <label className="block text-[12px] font-medium text-gray-700 uppercase tracking-wider">
                Topic
              </label>
              <select
                value={newConvContext}
                onChange={(e) => setNewConvContext(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
              >
                <option>General Inquiry</option>
                <option>Prescription Question</option>
                <option>Billing Issue</option>
                <option>Patient Issue</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewConvModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-900 text-[13px] font-semibold rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNewConversation}
                disabled={isSending}
                className="flex-1 px-4 py-2.5 bg-[#40721D] text-white text-[13px] font-semibold rounded-2xl hover:bg-[#355f1a] active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm"
              >
                {isSending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-3">
        {/* Conversation List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <h2 className="text-[12px] uppercase tracking-wider font-semibold text-gray-900">
                Conversations
              </h2>
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-[13px] text-gray-500">
                Loading...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-gray-500">
                No conversations yet
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      if (conv.unread) {
                        handleMarkAsRead(conv.id);
                      }
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-[#f8faf6] transition-colors ${
                      selectedConvId === conv.id ? "bg-[#f8faf6] border-l-4 border-l-[#40721D]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-[13px]">
                          {conv.contextLabel}
                        </h3>
                        <p className="text-[12px] text-gray-600 mt-1 truncate">
                          {conv.lastMessage}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {new Date(conv.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-[#40721D] text-white rounded-full text-[11px] font-semibold">
                            {conv.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col h-[600px] shadow-sm">
            {selectedConversation ? (
              <>
                {/* Thread Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                  <h2 className="text-[12px] uppercase tracking-wider font-semibold text-gray-900">
                    {selectedConversation.contextLabel}
                  </h2>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                  {selectedConversation.messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-[13px] py-8">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    selectedConversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.isFromPharmacy ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl ${
                            msg.isFromPharmacy
                              ? "bg-gray-100 text-gray-900"
                              : "bg-[#40721D] text-white"
                          }`}
                        >
                          <p className="text-[11px] font-semibold mb-1">
                            {msg.senderName}
                          </p>
                          <p className="text-[13px] break-words">{msg.text}</p>
                          <p
                            className={`text-[11px] mt-1 ${
                              msg.isFromPharmacy
                                ? "text-gray-600"
                                : "text-white/70"
                            }`}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Compose Area */}
                <form
                  onSubmit={handleSendMessage}
                  className="border-t border-gray-100 p-4 bg-gray-50"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
                    />
                    <button
                      type="submit"
                      disabled={isSending || !messageText.trim()}
                      className="px-4 py-2.5 bg-[#40721D] text-white text-[13px] font-semibold rounded-2xl hover:bg-[#355f1a] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      {isSending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-[13px]">
                <p>Select a conversation to view messages</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
