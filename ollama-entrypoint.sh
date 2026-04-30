#!/bin/bash
set -e

ollama serve &
OLLAMA_PID=$!

echo "Waiting for Ollama to start..."
until curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 2
done
echo "Ollama is ready."

echo "Pulling llama3..."
ollama pull llama3

echo "Pulling nomic-embed-text..."
ollama pull nomic-embed-text

echo "Models ready."
wait $OLLAMA_PID
