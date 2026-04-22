"use client";

import { useState, useEffect, useRef } from "react";

export default function WorkspaceChat({ workspaceId, currentUserId }: { workspaceId: string, currentUserId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() =>{
    const fetchMsgs = async () =>{
      const res = await fetch(`/api/messages?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 3000);
    return () =>clearInterval(interval);
  }, [workspaceId]);

  useEffect(() =>{
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) =>{
    e.preventDefault();
    if (!content.trim()) return;

    const tmpMsg = { id: Date.now().toString(), senderId: currentUserId, content, createdAt: new Date().toISOString() };
    setMessages(prev =>[...prev, tmpMsg]);
    setContent("");

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, content: tmpMsg.content })
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-primary px-6 py-4 text-white font-bold text-lg flex items-center gap-2">
         <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
         Workspace Chat
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 custom-scrollbar">
        {messages.length === 0 && (
          <p className="text-center text-muted text-sm mt-10">No messages yet. Say hello to kick off!</p>
        )}
        {messages.map((msg, i) =>{
          const isMine = msg.senderId === currentUserId;
          return (
            <div key={msg.id || i} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] px-5 py-3 text-sm shadow-sm
                ${isMine 
                  ? "bg-primary text-white rounded-[24px] rounded-br-sm" 
                  : "bg-white text-gray-800 border border-gray-100 rounded-[24px] rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
        <input 
          type="text" 
          value={content} 
          onChange={e =>setContent(e.target.value)}
          className="flex-1 bg-gray-50 border-none px-5 py-3 rounded-full text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-shadow"
          placeholder="Type your message..."
        />
        <button type="submit" disabled={!content.trim()} className="w-11 h-11 bg-primary text-white rounded-full flex items-center justify-center gap-2 hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white shrink-0">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
