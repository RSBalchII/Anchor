import threading
import time
from agents.archivist_agent import ArchivistAgent
from agents.distiller_agent import DistillerAgent
from tools.file_io import read_file_content

# --- Configuration ---
CYCLE_INTERVAL = 600  # 10 minutes
WORKING_MEMORY_PATH = "main_context.md"
ARCHIVE_CHUNK_SIZE = 4000 # Characters to archive each cycle

class AgentOrchestrator:
    """
    A Tier 3 agent responsible for orchestrating the Tier 2 agents
    in a continuous, autonomous loop.
    """
    def __init__(self):
        """
        Initializes the AgentOrchestrator and its subordinate agents.
        """
        print("--- Initializing Agent Orchestrator and subordinate agents... ---")
        self.distiller = DistillerAgent()
        self.archivist = ArchivistAgent()
        self.is_running = False
        self.thread = None
        print("--- All agents initialized successfully. ---")

    def _run_cycle(self):
        """
        Represents a single cycle of the orchestration loop. This function
        will be executed repeatedly in a background thread.
        """
        while self.is_running:
            print(f"--- [Orchestrator] Starting new cycle at {time.ctime()} ---")

            # 1. Get context to distill from working memory
            print("[Orchestrator] Reading working memory for context...")
            context_to_distill = read_file_content(WORKING_MEMORY_PATH)

            if context_to_distill:
                # 2. Trigger the Distiller Agent
                print("[Orchestrator] Triggering Distiller Agent...")
                self.distiller.orchestrate_distillation_crew(context_to_distill)
                print("[Orchestrator] Distiller Agent cycle complete.")

                # 3. Trigger the Archivist Agent
                print("[Orchestrator] Triggering Archivist Agent...")
                self.archivist.archive_from_working_memory(WORKING_MEMORY_PATH, ARCHIVE_CHUNK_SIZE)
                print("[Orchestrator] Archivist Agent cycle complete.")
            else:
                print("[Orchestrator] Working memory is empty. Nothing to process.")

            print(f"--- [Orchestrator] Cycle complete. Sleeping for {CYCLE_INTERVAL} seconds. ---")
            time.sleep(CYCLE_INTERVAL)

    def start(self):
        """
        Starts the autonomous orchestration loop in a background thread.
        """
        if not self.is_running:
            print("--- [Orchestrator] Starting autonomous background loop... ---")
            self.is_running = True
            self.thread = threading.Thread(target=self._run_cycle, daemon=True)
            self.thread.start()
            print("--- [Orchestrator] Loop started successfully in a background thread. ---")
        else:
            print("--- [Orchestrator] The loop is already running. ---")

    def stop(self):
        """
        Stops the autonomous orchestration loop.
        """
        if self.is_running:
            print("--- [Orchestrator] Stopping autonomous background loop... ---")
            self.is_running = False
            # The thread will exit gracefully after its current sleep cycle
            print("--- [Orchestrator] Loop will stop after the current cycle. ---")
        else:
            print("--- [Orchestrator] The loop is not currently running. ---")


if __name__ == "__main__":
    # This block is for testing the orchestrator directly
    print("--- Agent Orchestrator Test ---")
    orchestrator = AgentOrchestrator()
    orchestrator.start()

    # Keep the main thread alive to observe the background thread
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n--- [Test] Shutdown signal received. Stopping orchestrator. ---")
        orchestrator.stop()
        print("--- [Test] Orchestrator stopped. Exiting.---")
