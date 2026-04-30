import os
import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List

from app.config import settings
from app.models.schemas import UploadResponse, DocumentInfo, DeleteResponse
from app.core.ingestion import ingest_document, list_documents, delete_document
from app.core.rag_pipeline import get_vector_store

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx", ".csv", ".xlsx", ".xls"}


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}")

    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    try:
        vs = get_vector_store()
        doc_info = ingest_document(file_path, file.filename, vs)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

    return UploadResponse(message="Document uploaded and indexed successfully.", document=doc_info)


@router.get("/", response_model=List[DocumentInfo])
async def get_documents():
    vs = get_vector_store()
    return list_documents(vs)


@router.delete("/{document_id}", response_model=DeleteResponse)
async def remove_document(document_id: str):
    vs = get_vector_store()
    deleted = delete_document(document_id, vs)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DeleteResponse(message=f"Deleted {deleted} chunks.", document_id=document_id)
