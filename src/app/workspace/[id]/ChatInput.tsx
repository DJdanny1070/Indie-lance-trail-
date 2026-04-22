"use client";

import { useState, useRef } from "react";
import { Paperclip, Loader2 } from "lucide-react";

interface ChatInputProps {
  workspaceId: string;
}

export default function ChatInput({ workspaceId }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) =>{
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    // Upload to server
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setFileUrl(data.url);
        if (!message) setMessage("Sent an attachment.");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    if ((!message.trim() && !fileUrl) || sending) return;

    setSending(true);

    const formData = new FormData();
    formData.append("content", message);
    if (fileUrl) formData.append("fileUrl", fileUrl);

    try {
      await fetch(`/workspace/${workspaceId}`, {
        method: "POST",
        headers: { "x-action": "sendMessage" },
        body: formData,
      });

      // Use server action form submission instead
      const form = document.getElementById("hiddenSendForm") as HTMLFormElement;
      const contentInput = form?.querySelector('[name="content"]') as HTMLInputElement;
      const fileInput = form?.querySelector('[name="fileUrl"]') as HTMLInputElement;

      if (form && contentInput && fileInput) {
        contentInput.value = message;
        fileInput.value = fileUrl || "";
        form.requestSubmit();
      }

      setMessage("");
      setPreview(null);
      setFileUrl(null);
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  };

  const cancelPreview = () =>{
    setPreview(null);
    setFileUrl(null);
    if (message === "Sent an attachment.") setMessage("");
  };

  return (
    <div className="p-3 bg-[#f0f2f5] border-t border-gray-200">
      {/* Attachment Preview */}
      {preview && (
        <div className="mb-2 flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
          <img src={preview} alt="Preview" className="h-12 w-12 object-cover rounded" />
          <span className="text-xs text-gray-500 flex-grow truncate">File attached</span>
          <button type="button" onClick={cancelPreview} className="text-red-400 hover:text-red-600 text-lg font-bold">&times;</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-white rounded-full border border-gray-300 p-1.5 focus-within:border-green-500 transition-colors pl-3">
        {/* + Button → triggers hidden file input */}
        <button
          type="button"
          onClick={() =>fileInputRef.current?.click()}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          title="Attach file"
        >
          <Paperclip size={18} strokeWidth={2} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Text Input */}
        <input
          type="text"
          value={message}
          onChange={(e) =>setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow bg-transparent border-none outline-none text-sm text-gray-800 py-2 px-1"
          autoComplete="off"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={sending || (!message.trim() && !fileUrl)}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:scale-90 text-white rounded-full transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Send message"
          aria-label="Send message"
        >
          {sending
            ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
            : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white shrink-0" style={{ transform: "translateX(1px)" }}>
                <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
              </svg>}
        </button>
      </form>
    </div>
  );
}
