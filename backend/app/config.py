from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama3"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8000
    UPLOAD_DIR: str = "/app/uploads"
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    RETRIEVAL_K: int = 4

    class Config:
        env_file = ".env"


settings = Settings()
