import uuid
import os
from pathlib import Path
from typing import List

import pandas as pd
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.config import settings
from app.models.schemas import DocumentInfo

ROWS_PER_CHUNK = 50


def _dataframe_to_docs(df: pd.DataFrame, filename: str, sheet: str = "") -> List[Document]:
    """Convert a DataFrame into chunked Documents (ROWS_PER_CHUNK rows each)."""
    df = df.fillna("").astype(str)
    headers = list(df.columns)
    docs = []
    for start in range(0, len(df), ROWS_PER_CHUNK):
        chunk_df = df.iloc[start : start + ROWS_PER_CHUNK]
        rows_text = [
            " | ".join(f"{col}: {val}" for col, val in zip(headers, row))
            for _, row in chunk_df.iterrows()
        ]
        prefix = f"Sheet: {sheet}\n" if sheet else ""
        content = (
            f"{prefix}Columns: {', '.join(headers)}\n\n"
            + "\n".join(rows_text)
        )
        docs.append(
            Document(
                page_content=content,
                metadata={
                    "source": filename,
                    "sheet": sheet,
                    "rows": f"{start}–{start + len(chunk_df) - 1}",
                },
            )
        )
    return docs


def _load_csv(file_path: str, filename: str) -> List[Document]:
    df = pd.read_csv(file_path)
    return _dataframe_to_docs(df, filename)


def _load_excel(file_path: str, filename: str) -> List[Document]:
    xl = pd.ExcelFile(file_path, engine="openpyxl")
    docs = []
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        docs.extend(_dataframe_to_docs(df, filename, sheet=sheet))
    return docs


def _load_documents(file_path: str, filename: str) -> List[Document]:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
        return loader.load()
    elif ext == ".docx":
        loader = Docx2txtLoader(file_path)
        return loader.load()
    elif ext == ".txt":
        loader = TextLoader(file_path, encoding="utf-8")
        return loader.load()
    elif ext == ".csv":
        return _load_csv(file_path, filename)
    elif ext in {".xlsx", ".xls"}:
        return _load_excel(file_path, filename)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def ingest_document(file_path: str, filename: str, vector_store) -> DocumentInfo:
    document_id = str(uuid.uuid4())
    ext = Path(filename).suffix.lower().lstrip(".")

    raw_docs = _load_documents(file_path, filename)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        add_start_index=True,
    )
    chunks = splitter.split_documents(raw_docs)

    for i, chunk in enumerate(chunks):
        chunk.metadata.update(
            {
                "document_id": document_id,
                "filename": filename,
                "file_type": ext,
                "chunk_index": i,
                "page": chunk.metadata.get("page", 0),
            }
        )

    ids = [f"{document_id}_{i}" for i in range(len(chunks))]
    vector_store.add_documents(documents=chunks, ids=ids)

    return DocumentInfo(
        document_id=document_id,
        filename=filename,
        file_type=ext,
        chunk_count=len(chunks),
    )


def list_documents(vector_store) -> List[DocumentInfo]:
    try:
        collection = vector_store._collection
        results = collection.get(include=["metadatas"])
        metadatas = results.get("metadatas", [])
    except Exception:
        return []

    seen: dict[str, DocumentInfo] = {}
    for meta in metadatas:
        doc_id = meta.get("document_id", "")
        if doc_id and doc_id not in seen:
            seen[doc_id] = DocumentInfo(
                document_id=doc_id,
                filename=meta.get("filename", "unknown"),
                file_type=meta.get("file_type", ""),
                chunk_count=0,
            )
        if doc_id in seen:
            seen[doc_id].chunk_count += 1

    return list(seen.values())


def delete_document(document_id: str, vector_store) -> int:
    try:
        collection = vector_store._collection
        results = collection.get(where={"document_id": document_id}, include=[])
        ids = results.get("ids", [])
        if ids:
            collection.delete(ids=ids)
        return len(ids)
    except Exception:
        return 0
