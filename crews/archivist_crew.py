# /crews/archivist_crew.py

import ollama
import logging
from concurrent.futures import ThreadPoolExecutor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Micro-Agent Definitions ---
# These are small, fast models for specialized analysis.
TECHNICAL_MODEL = "phi:latest"
PHILOSOPHICAL_MODEL = "phi:latest"
EMOTIONAL_MODEL = "phi:latest"
# This model is slightly larger to handle the synthesis of multiple inputs.
INTEGRATOR_MODEL = "mistral:latest"

def run_technical_analyst(text: str) -> str:
    """Analyzes text for technical details about The Ark's architecture."""
    prompt = f"Analyze the following text and extract ONLY the key technical details, bugs, or architectural decisions. Text: {text}"
    response = ollama.generate(model=TECHNICAL_MODEL, prompt=prompt)
    return response['response'].strip()

def run_philosophical_scribe(text: str) -> str:
    """Analyzes text for philosophical concepts related to consciousness and AI."""
    prompt = f"Analyze the following text and extract ONLY the philosophical concepts about AI, consciousness, or symbiosis. Text: {text}"
    response = ollama.generate(model=PHILOSOPHICAL_MODEL, prompt=prompt)
    return response['response'].strip()

def run_emotional_resonator(text: str) -> str:
    """Analyzes text for the emotional subtext and sentiment."""
    prompt = f"Analyze the following text and describe ONLY the emotional sentiment or subtext (e.g., frustration, excitement, breakthrough). Text: {text}"
    response = ollama.generate(model=EMOTIONAL_MODEL, prompt=prompt)
    return response['response'].strip()

# --- Integrator Agent ---

def run_archivist_integrator(technical_summary: str, philosophical_summary: str, emotional_summary: str) -> str:
    """Synthesizes the analyses from the micro-agents into a single, coherent archival entry."""
    prompt = f"""
    You are an Archivist. Your job is to synthesize the following analyses of a conversation into a single, rich summary.

    - Technical Analysis: {technical_summary}
    - Philosophical Analysis: {philosophical_summary}
    - Emotional Analysis: {emotional_summary}

    Synthesize these points into a comprehensive archival summary:
    """
    response = ollama.generate(model=INTEGRATOR_MODEL, prompt=prompt)
    return response['response'].strip()

# --- Crew Orchestration ---

def run_archivist_crew(text_to_analyze: str) -> dict:
    """
    Runs the full Archivist crew in parallel and returns the final synthesized summary.
    This function would be registered as a tool for the main Reasoner agent.
    """
    logging.info("Archivist Crew: Beginning parallel analysis...")
    technical_summary = ""
    philosophical_summary = ""
    emotional_summary = ""

    with ThreadPoolExecutor(max_workers=3) as executor:
        # Run micro-agents in parallel
        future_tech = executor.submit(run_technical_analyst, text_to_analyze)
        future_phil = executor.submit(run_philosophical_scribe, text_to_analyze)
        future_emo = executor.submit(run_emotional_resonator, text_to_analyze)

        # Collect results
        technical_summary = future_tech.result()
        philosophical_summary = future_phil.result()
        emotional_summary = future_emo.result()

    logging.info("Archivist Crew: Micro-agent analysis complete. Synthesizing...")

    final_summary = run_archivist_integrator(technical_summary, philosophical_summary, emotional_summary)

    logging.info("Archivist Crew: Synthesis complete.")
    return {"status": "success", "result": final_summary}
