import { useState, useRef } from "react";
import { Upload, X, FileText, Sheet, Table } from "lucide-react";
import { uploadDocument } from "../api/client";

const ALLOWED_EXTENSIONS = /\.(pdf|txt|docx|csv|xlsx|xls)$/i;

const FILE_TYPE_LABELS = {
  pdf: { label: "PDF", color: "text-red-400" },
  txt: { label: "TXT", color: "text-gray-400" },
  docx: { label: "DOCX", color: "text-blue-400" },
  csv: { label: "CSV", color: "text-green-400" },
  xlsx: { label: "XLSX", color: "text-emerald-400" },
  xls: { label: "XLS", color: "text-emerald-400" },
};

function FileTypeBadge({ filename }) {
  const ext = filename.split(".").pop().toLowerCase();
  const info = FILE_TYPE_LABELS[ext] || { label: ext.toUpperCase(), color: "text-gray-400" };
  return (
    <span className={`text-xs font-bold ${info.color} bg-gray-800 px-2 py-0.5 rounded`}>
      {info.label}
    </span>
  );
}

export default function DocumentUpload({ onUploaded, onClose }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!ALLOWED_EXTENSIONS.test(f.name)) {
      setError("Supported formats: PDF, TXT, DOCX, CSV, XLSX, XLS");
      return;
    }
    setFile(f);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);
    try {
      const { data } = await uploadDocument(file, setProgress);
      setStatus("success");
      onUploaded(data.document);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed.");
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-white">Upload Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {status !== "success" ? (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current.click()}
              className="border-2 border-dashed border-gray-600 hover:border-indigo-500 rounded-lg p-8 text-center cursor-pointer transition-colors"
            >
              <Upload className="mx-auto mb-3 text-gray-400" size={32} />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileTypeBadge filename={file.name} />
                  <p className="text-gray-300 text-sm truncate max-w-xs">{file.name}</p>
                </div>
              ) : (
                <p className="text-gray-300 text-sm">Drag & drop or click to select</p>
              )}
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                {["PDF", "TXT", "DOCX", "CSV", "XLSX", "XLS"].map((t) => (
                  <span key={t} className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt,.docx,.csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
              />
            </div>

            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

            {status === "uploading" && (
              <div className="mt-4">
                <div className="bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-gray-400 text-xs mt-1 text-right">{progress}%</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || status === "uploading"}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {status === "uploading" ? "Uploading…" : "Upload & Index"}
            </button>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="text-green-400" size={24} />
            </div>
            <p className="text-white font-medium">Successfully indexed!</p>
            <p className="text-gray-400 text-sm mt-1">{file.name}</p>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
