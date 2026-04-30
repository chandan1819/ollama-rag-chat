import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronUp, FileText, Sparkles } from "lucide-react";

function SourceCard({ source }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-750 text-left transition-colors"
      >
        <FileText size={12} className="text-indigo-400 shrink-0" />
        <span className="text-xs text-gray-300 flex-1 truncate">
          {source.filename}{source.page != null ? `, p.${source.page + 1}` : ""}
        </span>
        {expanded ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
      </button>
      {expanded && (
        <div className="px-3 py-2 bg-gray-850 text-xs text-gray-400 leading-relaxed border-t border-gray-700">
          {source.content}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const [showReasoning, setShowReasoning] = useState(false);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-xl bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      <div className="bg-gray-800 border border-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm">
        {message.streaming && !message.content ? (
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {message.reasoning && (
        <div>
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Sparkles size={12} />
            {showReasoning ? "Hide reasoning" : "Show reasoning"}
          </button>
          {showReasoning && (
            <div className="mt-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-400 leading-relaxed">
              {message.reasoning}
            </div>
          )}
        </div>
      )}

      {message.sources?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-600">Sources</p>
          {message.sources.map((s, i) => (
            <SourceCard key={i} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}
