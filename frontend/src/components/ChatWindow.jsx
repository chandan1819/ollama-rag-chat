import { useState, useRef, useEffect } from "react";
import { Send, AlertCircle } from "lucide-react";
import MessageBubble from "./MessageBubble";
import { streamQuery } from "../api/client";

export default function ChatWindow({ model, useHyde, hasDocuments }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || isStreaming) return;

    setInput("");
    setError("");

    const userMsg = { id: Date.now(), role: "user", content: query };
    const assistantId = Date.now() + 1;
    const assistantMsg = {
      id: assistantId,
      role: "assistant",
      content: "",
      reasoning: null,
      sources: [],
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    let fullContent = "";
    let reasoning = null;

    try {
      for await (const chunk of streamQuery(query, { model, useHyde })) {
        if (chunk.type === "token") {
          fullContent += chunk.content;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullContent } : m
            )
          );
        } else if (chunk.type === "sources") {
          const raw = fullContent;
          if (raw.includes("**Reasoning:**") && raw.includes("**Answer:**")) {
            reasoning = raw.split("**Reasoning:**")[1].split("**Answer:**")[0].trim();
            fullContent = raw.split("**Answer:**")[1].trim();
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: fullContent, reasoning, sources: chunk.sources, streaming: false }
                : m
            )
          );
        } else if (chunk.type === "error") {
          setError(chunk.content);
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        }
      }
    } catch (err) {
      setError(err.message || "Failed to connect to backend.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-3xl">🧠</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">RAG Chat</h2>
            <p className="text-gray-500 text-sm max-w-sm">
              {hasDocuments
                ? "Ask anything about your documents. Using HyDE + chain-of-thought reasoning."
                : "Upload a document in the sidebar to get started."}
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-3 flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-end gap-3 bg-gray-800 border border-gray-700 focus-within:border-indigo-600 rounded-xl px-4 py-3 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={hasDocuments ? "Ask a question…" : "Upload a document first"}
            disabled={!hasDocuments || isStreaming}
            className="flex-1 bg-transparent resize-none text-sm text-white placeholder-gray-600 focus:outline-none max-h-32 scrollbar-thin disabled:opacity-50"
            style={{ height: "auto" }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || !hasDocuments}
            className="w-8 h-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-gray-700 text-xs text-center mt-2">
          Model: {model} · HyDE: {useHyde ? "on" : "off"} · Enter to send
        </p>
      </div>
    </div>
  );
}
