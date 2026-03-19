import json
import httpx
from google import genai
from openai import OpenAI
from src.config import config
from src.logger import logger

class LLMService:
    def __init__(self):
        self.backend = config.LLM_BACKEND
        self.model = config.LLM_MODEL
        
        self.openai_client = None
        if self.backend == "openai":
            self.openai_client = OpenAI(api_key=config.OPENAI_API_KEY)
            
        self.gemini_client = None
        if config.GEMINI_API_KEY:
            self.gemini_client = genai.Client(api_key=config.GEMINI_API_KEY)

    async def generate_json(self, prompt: str, system_prompt: str = "You are a helpful assistant.", backend: str = None, model: str = None) -> dict:
        """
        Generates a JSON response from the configured LLM backend.
        """
        target_backend = backend or self.backend
        target_model = model or self.model

        if target_backend == "openai":
            return await self._generate_openai(prompt, system_prompt, target_model)
        elif target_backend == "ollama":
            return await self._generate_ollama(prompt, system_prompt, target_model)
        elif target_backend == "gemini":
            return await self._generate_gemini(prompt, system_prompt, target_model)
        else:
            raise ValueError(f"Unsupported LLM backend: {target_backend}")

    async def _generate_openai(self, prompt: str, system_prompt: str, model: str) -> dict:
        logger.info(f"Generating with OpenAI ({model})...")
        
        if not self.openai_client:
            self.openai_client = OpenAI(api_key=config.OPENAI_API_KEY)

        try:
            response = self.openai_client.chat.completions.create(
                model=model,
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

    async def _generate_ollama(self, prompt: str, system_prompt: str, model: str) -> dict:
        logger.info(f"Generating with Ollama ({model}) at {config.OLLAMA_URL}...")
        url = f"{config.OLLAMA_URL}/api/generate"
        
        payload = {
            "model": model,
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

    async def _generate_gemini(self, prompt: str, system_prompt: str, model: str) -> dict:
        logger.info(f"Generating with Gemini ({model})...")
        
        if not self.gemini_client:
            # Try to initialize if key was added later
            if config.GEMINI_API_KEY:
                self.gemini_client = genai.Client(api_key=config.GEMINI_API_KEY)
            else:
                raise ValueError("GEMINI_API_KEY is not set in configuration.")
        
        try:
            # Use run_in_executor since the google-genai library is synchronous
            import asyncio
            loop = asyncio.get_event_loop()
            
            # Use the new SDK's structure
            def call_gemini():
                return self.gemini_client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        "system_instruction": system_prompt,
                        "response_mime_type": "application/json",
                    }
                )

            response = await loop.run_in_executor(None, call_gemini)
            
            # The response text should be valid JSON
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            raise

llm_service = LLMService()
