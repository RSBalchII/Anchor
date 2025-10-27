import os
import httpx
import logging
from tavily import TavilyClient

class WebSearchAgent:
    def __init__(self, model: str, tavily_api_key: str = None, api_base: str = "http://localhost:8085/v1"):
        self.model = model
        # Use the provided API key, or fall back to environment variable
        self.tavily_client = TavilyClient(api_key=tavily_api_key or os.getenv("TAVILY_API_KEY"))
        self.api_base = api_base

    async def search(self, *, query: str, system_prompt: str = "You are a helpful AI assistant that answers questions based on web search results.") -> dict:
        print(f"WebSearchAgent searching for: '{query}'")
        try:
            search_results = self.tavily_client.search(query, search_depth="advanced")
            context = " ".join([result["content"] for result in search_results.get("results", [])])
            
            # Extract websites from search results
            websites_searched = [result["url"] for result in search_results.get("results", [])]
            
            prompt = f"Based on the following context, please answer the user's query.\n\nContext:\n{context}\n\nQuery:\n{query}"

            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "stream": False,
                "options": {
                    "num_gpu": 37
                }
            }

            if "ollama" in self.api_base:
                url = f"{self.api_base}/api/chat"
            else:
                url = f"{self.api_base}/chat/completions"

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                answer = data.get('message', {}).get('content', '')
                
                return {
                    "success": True,
                    "answer": answer,
                    "websites_searched": websites_searched,
                    "raw_results": search_results
                }

        except httpx.HTTPStatusError as e:
            logging.error(f"HTTP error occurred: {e.response.status_code} for URL {e.request.url}")
            return {
                "answer": f"A web search error occurred (HTTP {e.response.status_code}).",
                "websites_searched": [],
                "error": f"HTTP error {e.response.status_code}"
            }
        except httpx.RequestError as e:
            logging.error(f"Request error occurred: {e.__class__.__name__} for URL {e.request.url}")
            return {
                "answer": "A web search error occurred (could not connect).",
                "websites_searched": [],
                "error": "Connection error"
            }
        except Exception as e:
            logging.error(f"An unexpected error occurred during web search: {e}", exc_info=True)
            return {
                "answer": "An unexpected error occurred during web search.",
                "websites_searched": [],
                "error": str(e)
            }