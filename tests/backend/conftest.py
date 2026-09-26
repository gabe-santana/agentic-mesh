import os
import sys

BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "backend")
sys.path.insert(0, os.path.abspath(BACKEND_DIR))

os.environ.setdefault("AZURE_AI_FOUNDRY_ENDPOINT", "https://example-test.services.ai.azure.com/models")
os.environ.setdefault("AZURE_AI_FOUNDRY_API_KEY", "test-key")
os.environ.setdefault("JWT_SECRET", "test-secret")
