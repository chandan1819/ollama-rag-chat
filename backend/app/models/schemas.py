from pydantic import BaseModel
from typing import List, Optional


class QueryRequest(BaseModel):
    query: str
    model: Optional[str] = None
    use_hyde: bool = True
    k: int = 4


class Source(BaseModel):
    document_id: str
    filename: str
    page: Optional[int] = None
    chunk_index: int
    content: str


class StreamChunk(BaseModel):
    type: str  # "hyde" | "token" | "sources" | "error" | "done"
    content: Optional[str] = None
    sources: Optional[List[Source]] = None


class QueryResponse(BaseModel):
    answer: str
    reasoning: Optional[str] = None
    sources: List[Source]


class DocumentInfo(BaseModel):
    document_id: str
    filename: str
    file_type: str
    chunk_count: int


class UploadResponse(BaseModel):
    message: str
    document: DocumentInfo


class DeleteResponse(BaseModel):
    message: str
    document_id: str
