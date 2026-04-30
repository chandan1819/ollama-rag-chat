import { useState } from "react";
import { FileText, Trash2, Plus, Brain, ChevronDown } from "lucide-react";
import DocumentUpload from "./DocumentUpload";

const MODELS = ["llama3", "mistral", "llama3.1", "phi3"];

export default function Sidebar({ documents, onDocumentsChange, model, onModelChange, useHyde, onHydeChange }) {
  const [showUpload, setShowUpload] = useState(false);

  const handleUploaded = (doc) => {
    onDocumentsChange([...documents, doc]);
    setShowUpload(false);
  };

  const handleDelete = async (id) => {
    const { deleteDocument } = await import("../api/client");
    await deleteDocument(id).catch(() => {});
    onDocumentsChange(documents.filter((d) => d.document_id !== id));
  };

  return (
    <>
      <aside className="w-64 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={20} className="text-indigo-400" />
            <span className="font-bold text-white text-lg">RAG Chat</span>
          </div>
          <p className="text-gray-500 text-xs">Local AI · Ollama + ChromaDB</p>
        </div>

        {/* Model selector */}
        <div className="p-4 border-b border-gray-800">
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Model</label>
          <div className="relative">
            <select
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 appearance-none cursor-pointer"
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
          </div>

          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <div
              onClick={() => onHydeChange(!useHyde)}
              className={`w-9 h-5 rounded-full transition-colors relative ${useHyde ? "bg-indigo-600" : "bg-gray-700"}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${useHyde ? "left-4" : "left-0.5"}`}
              />
            </div>
            <span className="text-xs text-gray-400">HyDE retrieval</span>
          </label>
        </div>

        {/* Documents */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Documents</span>
            <button
              onClick={() => setShowUpload(true)}
              className="w-6 h-6 bg-indigo-600 hover:bg-indigo-500 rounded flex items-center justify-center transition-colors"
              title="Upload document"
            >
              <Plus size={14} />
            </button>
          </div>

          {documents.length === 0 ? (
            <p className="text-gray-600 text-xs text-center mt-8">
              No documents yet.<br />Upload one to get started.
            </p>
          ) : (
            <ul className="space-y-1">
              {documents.map((doc) => (
                <li
                  key={doc.document_id}
                  className="flex items-start gap-2 group p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <FileText size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-600">{doc.chunk_count} chunks</p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.document_id)}
                    className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-gray-800">
          <p className="text-gray-700 text-xs text-center">Runs 100% locally</p>
        </div>
      </aside>

      {showUpload && (
        <DocumentUpload onUploaded={handleUploaded} onClose={() => setShowUpload(false)} />
      )}
    </>
  );
}
