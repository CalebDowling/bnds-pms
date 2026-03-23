"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  senderName: string;
  timestamp: string;
  text: string;
  isFromPharmacy: boolean;
}

interface Conversation {
  id: string;
  contextLabel: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConvId, conversations]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await fetch("/api/prescriber-portal/messages");
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      setConversations(data.conversations || []);
      if (data.conversations && data.conversations.length > 0) {
        setSelectedConvId(data.conversations[0].id);
      }
    } catch (err) {
      setError("Error loading messages. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConvId) return;

    try {
      setIsSending(true);
      const response = await fetch("/api/prescriber-portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newConversation: true,
          pharmacyContext: "General Inquiry",
        }),
      });

      if (!response.ok) throw new Error("Failed to create conversation");

      setShowNewConvModal(false);
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
            Communication with the pharmacy
          </p>
        </div>
        <button
          onClick={() => setShowNewConvModal(true)}
          className="px-4 py-2 bg-[#40721D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#355f1a] active:scale-[0.98] transition-all shadow-sm"
        >
          + New Message
        </button>
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
          <div className="bg-white rounded-2xl border border-gray-100 max-w-md w-full p-6">
            <h2 className="text-[15px] font-semibold text-gray-900 mb-4">
              Start New Conversation
            </h2>
            <p className="text-[13px] text-gray-600 mb-4">
              Start a new message with the pharmacy about your prescriptions or
              questions.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleNewConversation}
                disabled={isSending}
                className="w-full px-4 py-2.5 bg-[#40721D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#355f1a] active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm"
              >
                {isSending ? "Creating..." : "Create Conversation"}
              </button>
              <button
                onClick={() => setShowNewConvModal(false)}
                className="w-full px-4 py-2.5 bg-gray-100 text-gray-900 text-[13px] font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-3">
        {/* Conversation List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-50">
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
              <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-50">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-[#f8faf6] transition-colors ${
                      selectedConvId === conv.id ? "bg-[#f8faf6] border-l-4 border-l-[#40721D]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900 text-[13px]">
                        {conv.contextLabel}
                      </h3>
                      {conv.unread && (
                        <span className="w-2 h-2 bg-[#40721D] rounded-full"></span>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-600 mt-1 truncate">
                      {conv.lastMessage}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {new Date(conv.timestamp).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col h-[600px]">
            {selectedConversation ? (
              <>
                {/* Thread Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-50">
                  <h2 className="text-[12px] uppercase tracking-wider font-semibold text-gray-900">
                    {selectedConversation.contextLabel}
                  </h2>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                          className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-xl ${
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
                  className="border-t border-gray-50 p-4 bg-gray-50"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
                    />
                    <button
                      type="submit"
                      disabled={isSending || !messageText.trim()}
                      className="px-4 py-2.5 bg-[#40721D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#355f1a] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
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
