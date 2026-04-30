import json
from typing import AsyncGenerator, List

from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_core.messages import HumanMessage, SystemMessage
import chromadb

from app.config import settings
from app.models.schemas import Source, QueryResponse, StreamChunk

_RAG_SYSTEM_PROMPT = """You are an expert assistant that answers questions strictly based on the provided document context.

Instructions:
1. Read all provided context passages carefully.
2. Think through the answer step by step (chain-of-thought reasoning).
3. Provide a comprehensive, accurate answer based ONLY on the context.
4. Cite sources inline using [Source: <filename>, Page <N>] format after each fact.
5. If the context is insufficient, say so explicitly.

Format your response exactly as:
**Reasoning:** <your step-by-step analysis>

**Answer:** <comprehensive answer with inline source citations>"""

_HYDE_PROMPT = """Generate a short, factual document passage that would perfectly answer the following question.
Write only the passage itself — no preamble, no labels:

Question: {query}

Passage:"""


def _build_vector_store(embed_model: str) -> Chroma:
    embeddings = OllamaEmbeddings(
        base_url=settings.OLLAMA_BASE_URL, model=embed_model
    )
    chroma_client = chromadb.HttpClient(
        host=settings.CHROMA_HOST, port=settings.CHROMA_PORT
    )
    return Chroma(
        client=chroma_client,
        collection_name="documents",
        embedding_function=embeddings,
    )


_vector_store: Chroma | None = None


def get_vector_store() -> Chroma:
    global _vector_store
    if _vector_store is None:
        _vector_store = _build_vector_store(settings.OLLAMA_EMBED_MODEL)
    return _vector_store


def _sources_from_docs(docs) -> List[Source]:
    sources = []
    for doc in docs:
        meta = doc.metadata
        sources.append(
            Source(
                document_id=meta.get("document_id", ""),
                filename=meta.get("filename", "unknown"),
                page=meta.get("page"),
                chunk_index=meta.get("chunk_index", 0),
                content=doc.page_content[:300],
            )
        )
    return sources


def _format_context(docs) -> str:
    parts = []
    for doc in docs:
        meta = doc.metadata
        label = f"[Source: {meta.get('filename', 'unknown')}, Page {meta.get('page', '?')}]"
        parts.append(f"{label}\n{doc.page_content}")
    return "\n\n---\n\n".join(parts)


async def _hyde_transform(query: str, llm: ChatOllama) -> str:
    response = await llm.ainvoke([HumanMessage(content=_HYDE_PROMPT.format(query=query))])
    return response.content


def _parse_response(raw: str):
    reasoning, answer = None, raw
    if "**Reasoning:**" in raw and "**Answer:**" in raw:
        try:
            reasoning = raw.split("**Reasoning:**")[1].split("**Answer:**")[0].strip()
            answer = raw.split("**Answer:**")[1].strip()
        except IndexError:
            pass
    return reasoning, answer


async def query(
    user_query: str,
    model: str | None = None,
    use_hyde: bool = True,
    k: int = 4,
) -> QueryResponse:
    llm = ChatOllama(base_url=settings.OLLAMA_BASE_URL, model=model or settings.OLLAMA_MODEL)
    vs = get_vector_store()

    retrieval_query = user_query
    if use_hyde:
        retrieval_query = await _hyde_transform(user_query, llm)

    docs = vs.similarity_search(retrieval_query, k=k)
    context = _format_context(docs)
    sources = _sources_from_docs(docs)

    messages = [
        SystemMessage(content=_RAG_SYSTEM_PROMPT),
        HumanMessage(content=f"Context:\n{context}\n\nQuestion: {user_query}"),
    ]
    response = await llm.ainvoke(messages)
    reasoning, answer = _parse_response(response.content)

    return QueryResponse(answer=answer, reasoning=reasoning, sources=sources)


async def stream_query(
    user_query: str,
    model: str | None = None,
    use_hyde: bool = True,
    k: int = 4,
) -> AsyncGenerator[str, None]:
    llm = ChatOllama(base_url=settings.OLLAMA_BASE_URL, model=model or settings.OLLAMA_MODEL)
    vs = get_vector_store()

    retrieval_query = user_query
    if use_hyde:
        hypo = await _hyde_transform(user_query, llm)
        retrieval_query = hypo
        yield f"data: {StreamChunk(type='hyde', content=hypo).model_dump_json()}\n\n"

    docs = vs.similarity_search(retrieval_query, k=k)
    context = _format_context(docs)
    sources = _sources_from_docs(docs)

    messages = [
        SystemMessage(content=_RAG_SYSTEM_PROMPT),
        HumanMessage(content=f"Context:\n{context}\n\nQuestion: {user_query}"),
    ]

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield f"data: {StreamChunk(type='token', content=chunk.content).model_dump_json()}\n\n"

    yield f"data: {StreamChunk(type='sources', sources=sources).model_dump_json()}\n\n"
    yield f"data: {StreamChunk(type='done').model_dump_json()}\n\n"
