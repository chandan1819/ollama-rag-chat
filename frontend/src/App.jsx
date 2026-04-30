import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import { listDocuments } from "./api/client";

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [model, setModel] = useState("llama3");
  const [useHyde, setUseHyde] = useState(true);

  useEffect(() => {
    listDocuments()
      .then((res) => setDocuments(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        documents={documents}
        onDocumentsChange={setDocuments}
        model={model}
        onModelChange={setModel}
        useHyde={useHyde}
        onHydeChange={setUseHyde}
      />
      <ChatWindow
        model={model}
        useHyde={useHyde}
        hasDocuments={documents.length > 0}
      />
    </div>
  );
}
