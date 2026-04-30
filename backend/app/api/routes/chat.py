from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import QueryRequest, QueryResponse
from app.core import rag_pipeline

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query_chat(request: QueryRequest):
    try:
        return await rag_pipeline.query(
            user_query=request.query,
            model=request.model,
            use_hyde=request.use_hyde,
            k=request.k,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def stream_chat(request: QueryRequest):
    async def generate():
        try:
            async for chunk in rag_pipeline.stream_query(
                user_query=request.query,
                model=request.model,
                use_hyde=request.use_hyde,
                k=request.k,
            ):
                yield chunk
        except Exception as e:
            from app.models.schemas import StreamChunk
            yield f"data: {StreamChunk(type='error', content=str(e)).model_dump_json()}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
