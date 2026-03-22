"use client";

import { useEffect, useState } from "react";
import { getMessages, getUnreadCounts, markAsRead, sendReply } from "./actions";

interface Message {
  id: string;
  channel: string;
  fromAddress?: string;
  toAddress: string;
  subject?: string;
  body?: string;
  status: string;
  createdAt: string;
  isRead?: boolean;
}

interface UnreadCounts {
  sms: number;
  email: number;
  voicemail: number;
  fax: number;
}

const channels = ["sms", "email", "voicemail", "fax"] as const;

export default function CommunicationsClient() {
  const [activeTab, setActiveTab] = useState<"sms" | "email" | "voicemail" | "fax">("sms");
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    sms: 0,
    email: 0,
    voicemail: 0,
    fax: 0,
  });
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Fetch messages for active tab
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const data = await getMessages(activeTab, { search: searchTerm });
        setMessages(data);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [activeTab, searchTerm]);

  // Fetch unread counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const counts = await getUnreadCounts();
        setUnreadCounts(counts);
      } catch (error) {
        console.error("Failed to fetch unread counts:", error);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await markAsRead(messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isRead: true } : m))
      );
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, isRead: true });
      }
      // Refresh counts
      const counts = await getUnreadCounts();
      setUnreadCounts(counts);
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyBody.trim()) return;

    setSendingReply(true);
    try {
      await sendReply(selectedMessage.id, replyBody);
      setReplyBody("");
      // Refresh messages
      const data = await getMessages(activeTab, { search: searchTerm });
      setMessages(data);
      // Reset selected message
      setSelectedMessage(null);
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setSendingReply(false);
    }
  };

  const filteredMessages = messages.filter(
    (m) =>
      !searchTerm ||
      m.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.toAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.fromAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Communications Inbox</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Manage SMS, email, voicemail, and fax messages</p>
      </div>

      <div className="flex flex-1 overflow-hidden gap-6 p-6">
        {/* Messages List */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
            {channels.map((channel) => (
              <button
                key={channel}
                onClick={() => setActiveTab(channel)}
                className={`px-4 py-3 font-medium text-sm relative transition-colors ${
                  activeTab === channel
                    ? "text-[#40721d] dark:text-[#6bb240] border-b-2 border-[#40721d] dark:border-[#6bb240]"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <span className="capitalize">{channel}</span>
                {unreadCounts[channel as keyof UnreadCounts] > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadCounts[channel as keyof UnreadCounts]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#40721d]"
            />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500 dark:text-gray-400">Loading messages...</div>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500 dark:text-gray-400">No messages found</div>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => {
                    setSelectedMessage(message);
                    if (!message.isRead) {
                      handleMarkAsRead(message.id);
                    }
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedMessage?.id === message.id
                      ? "border-[#40721d] bg-green-50 dark:bg-green-950/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  } ${!message.isRead ? "bg-blue-50 dark:bg-blue-950/10" : "bg-white dark:bg-gray-800"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {message.fromAddress || message.toAddress}
                        </p>
                        {!message.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {message.subject || message.body || "No content"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {message.status && (
                      <span className="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {message.status}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Detail Panel */}
        {selectedMessage ? (
          <div className="w-96 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Panel Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {selectedMessage.subject || selectedMessage.fromAddress || "Message"}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {new Date(selectedMessage.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">FROM</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedMessage.fromAddress || "N/A"}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">TO</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedMessage.toAddress}</p>
                </div>
                {selectedMessage.subject && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">SUBJECT</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedMessage.subject}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">MESSAGE</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-2 whitespace-pre-wrap break-words">
                    {selectedMessage.body || "No message content"}
                  </p>
                </div>
              </div>
            </div>

            {/* Reply Section */}
            {(activeTab === "sms" || activeTab === "email") && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <textarea
                  placeholder="Type your reply..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#40721d] resize-none"
                  rows={3}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyBody.trim()}
                  className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-[#40721d] to-[#5a9f2a] hover:from-[#36631a] hover:to-[#4f8925] text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {sendingReply ? "Sending..." : "Send Reply"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-96 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-center">Select a message to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
