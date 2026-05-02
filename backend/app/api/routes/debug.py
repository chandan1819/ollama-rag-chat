from fastapi import APIRouter, Query
from typing import List, Optional
from pydantic import BaseModel

from app.core.rag_pipeline import get_vector_store

router = APIRouter()


class ChunkRow(BaseModel):
    id: str
    document_id: str
    filename: str
    file_type: str
    page: Optional[int] = None
    chunk_index: int
    content_preview: str


class CollectionStats(BaseModel):
    total_chunks: int
    documents: List[dict]


@router.get("/stats", response_model=CollectionStats, summary="Collection overview")
def collection_stats():
    """Total chunks + per-document breakdown."""
    vs = get_vector_store()
    collection = vs._collection
    results = collection.get(include=["metadatas"])
    metadatas = results.get("metadatas", [])

    seen: dict[str, dict] = {}
    for meta in metadatas:
        doc_id = meta.get("document_id", "")
        if doc_id not in seen:
            seen[doc_id] = {
                "document_id": doc_id,
                "filename": meta.get("filename", "unknown"),
                "file_type": meta.get("file_type", ""),
                "chunk_count": 0,
            }
        seen[doc_id]["chunk_count"] += 1

    return CollectionStats(total_chunks=len(metadatas), documents=list(seen.values()))


@router.get("/chunks", response_model=List[ChunkRow], summary="Browse stored chunks")
def list_chunks(
    limit: int = Query(20, ge=1, le=200, description="Max rows to return"),
    offset: int = Query(0, ge=0, description="Skip N chunks"),
    filename: Optional[str] = Query(None, description="Filter by filename"),
    file_type: Optional[str] = Query(None, description="Filter by type: pdf, csv, xlsx, docx, txt"),
):
    """Browse raw chunks stored in ChromaDB — useful for debugging ingestion."""
    vs = get_vector_store()
    collection = vs._collection

    where = {}
    if filename:
        where["filename"] = {"$eq": filename}
    if file_type:
        where["file_type"] = {"$eq": file_type}

    kwargs = dict(include=["documents", "metadatas"])
    if where:
        kwargs["where"] = where

    results = collection.get(**kwargs)
    ids = results.get("ids", [])
    docs = results.get("documents", [])
    metas = results.get("metadatas", [])

    rows = []
    for cid, doc, meta in zip(ids, docs, metas):
        rows.append(
            ChunkRow(
                id=cid,
                document_id=meta.get("document_id", ""),
                filename=meta.get("filename", "unknown"),
                file_type=meta.get("file_type", ""),
                page=meta.get("page"),
                chunk_index=meta.get("chunk_index", 0),
                content_preview=(doc or "")[:300],
            )
        )

    rows.sort(key=lambda r: (r.filename, r.chunk_index))
    return rows[offset : offset + limit]
