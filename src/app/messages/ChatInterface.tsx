"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type User = {
  id: string;
  name: string;
  role: string;
};

type Message = {
  id: string;
  senderId: string;
  receiverId: string | null;
  content: string;
  createdAt: string;
};

export default function ChatInterface({
  currentUserId,
  participants,
  initialSelectedUserId
}: {
  currentUserId: string;
  participants: User[];
  initialSelectedUserId: string | null;
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(
    participants.find(p => p.id === initialSelectedUserId) || participants[0] || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/messages?otherUserId=${selectedUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser) return;

    const currentText = inputText;
    setInputText("");

    // Optimistic UI update
    setMessages(prev => [...prev, {
      id: "temp-" + Date.now(),
      senderId: currentUserId,
      receiverId: selectedUser.id,
      content: currentText,
      createdAt: new Date().toISOString()
    }]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: selectedUser.id, content: currentText })
      });
      if (res.ok) {
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex bg-white h-full w-full font-sans antialiased text-gray-900 border overflow-hidden rounded-xl shadow-sm">
      {/* Sidebar / Contacts List */}
      <div className="w-1/3 sm:w-1/4 md:w-[320px] bg-[#f9fafb] border-r flex flex-col h-full z-10">
        <div className="p-4 border-b bg-white flex justify-between items-center shadow-sm">
          <h2 className="font-bold text-lg text-gray-800">Inbox</h2>
        </div>

        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          {participants.length === 0 && (
            <div className="p-6 text-sm text-center text-gray-500">
              No active conversations. Reach out to someone to start chatting!
            </div>
          )}
          {participants.map(p => {
            const isSelected = selectedUser?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedUser(p)}
                className={`p-4 border-b border-gray-100 flex items-center gap-3 cursor-pointer transition-all duration-200 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-100 border-l-4 border-l-transparent'
                  }`}
              >
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="font-semibold text-gray-800 truncate">{p.name}</div>
                  <div className="text-xs text-gray-500 font-medium truncate tracking-wide uppercase mt-0.5">{p.role}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="h-[72px] px-6 border-b flex items-center justify-between bg-white/95 backdrop-blur-sm shadow-sm z-20">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-sm">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-800 leading-tight">{selectedUser.name}</h2>
                  <Link href={`/${selectedUser.role.toLowerCase()}/${selectedUser.id}`} className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium">
                    View Profile
                  </Link>
                </div>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-4 bg-gray-50 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center max-w-sm mx-auto text-center opacity-70">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex justify-center items-center mb-4">
                    <span className="text-3xl"></span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No emails yet</h3>
                  <p className="text-gray-500 text-sm">Send an email to {selectedUser.name} to start the thread.</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMe = m.senderId === currentUserId;

                  return (
                    <div key={m.id} className="w-full bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-4">
                      <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                        <div>
                          <div className="font-bold text-gray-800 text-[15px]">
                            {isMe ? "Me" : selectedUser.name} <span className="text-gray-400 font-normal ml-1">&lt;{isMe ? "me" : selectedUser.name.toLowerCase().replace(/\s+/g, '.')}@indielance.com&gt;</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            To: {isMe ? selectedUser.name : "Me"}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>
                      <div className="text-[15px] text-gray-800 whitespace-pre-wrap word-break leading-relaxed">
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 z-20">
              <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 px-5 py-3 rounded-full text-[15px] focus:ring-2 focus:ring-blue-500/20 outline-none transition-shadow"
                  placeholder={`Reply to ${selectedUser.name}...`}
                />
                <button type="submit" disabled={!inputText.trim()} className="w-11 h-11 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white shrink-0">
                    <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col bg-gray-50/50">
            <div className="w-24 h-24 mb-6 rounded-3xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-blue-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="w-6 h-6 shrink-0"
              >
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Messages</h2>
            <p className="text-gray-500 max-w-md text-center">Select a conversation from the sidebar to start securely communicating with freelancers and employers.</p>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 20px; }
      `}} />
    </div>
  );
}
