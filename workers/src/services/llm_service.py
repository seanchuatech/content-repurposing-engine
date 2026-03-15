import json
import httpx
from openai import OpenAI
from src.config import config
from src.logger import logger

class LLMService:
    def __init__(self):
        self.backend = config.LLM_BACKEND
        self.model = config.LLM_MODEL
        
        if self.backend == "openai":
            self.client = OpenAI(api_key=config.OPENAI_API_KEY)
        else:
            self.client = None # For Ollama we use httpx directly

    async def generate_json(self, prompt: str, system_prompt: str = "You are a helpful assistant.") -> dict:
        """
        Generates a JSON response from the configured LLM backend.
        """
        if self.backend == "openai":
            return await self._generate_openai(prompt, system_prompt)
        elif self.backend == "ollama":
            return await self._generate_ollama(prompt, system_prompt)
        else:
            raise ValueError(f"Unsupported LLM backend: {self.backend}")

    async def _generate_openai(self, prompt: str, system_prompt: str) -> dict:
        logger.info(f"Generating with OpenAI ({self.model})...")
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")
            raise

    async def _generate_ollama(self, prompt: str, system_prompt: str) -> dict:
        logger.info(f"Generating with Ollama ({self.model}) at {config.OLLAMA_URL}...")
        url = f"{config.OLLAMA_URL}/api/generate"
        
        # Ollama supports system prompts and format="json"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "format": "json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                result = response.json()
                content = result.get("response", "{}")
                return json.loads(content)
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            raise

llm_service = LLMService()
