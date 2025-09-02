import unittest
from unittest.mock import patch, MagicMock
import threading
import time
import os

# Assuming the project root is the current working directory for imports
# This might need adjustment based on how the project is structured and run
# For testing purposes, we'll mock the imports if they cause issues.
from agents.orchestrator import AgentOrchestrator, CYCLE_INTERVAL, WORKING_MEMORY_PATH, ARCHIVE_CHUNK_SIZE

class TestAgentOrchestrator(unittest.TestCase):

    def setUp(self):
        """
        Initializes a fresh AgentOrchestrator for each test.
        """
        # We need to patch the agents during __init__ to prevent actual instantiation
        # and to control their behavior.
        with patch('agents.orchestrator.DistillerAgent') as MockDistillerAgent, \
             patch('agents.orchestrator.ArchivistAgent') as MockArchivistAgent:
            self.orchestrator = AgentOrchestrator()
            self.mock_distiller_agent = MockDistillerAgent.return_value
            self.mock_archivist_agent = MockArchivistAgent.return_value

    def test_initialization(self):
        """
        Verify that the AgentOrchestrator initializes its subordinate agents upon creation.
        """
        # The setUp method already ensures that DistillerAgent and ArchivistAgent
        # are mocked and their return values are captured.
        # We just need to assert that they were called.
        with patch('agents.orchestrator.DistillerAgent') as MockDistillerAgent, \
             patch('agents.orchestrator.ArchivistAgent') as MockArchivistAgent:
            orchestrator = AgentOrchestrator()
            MockDistillerAgent.assert_called_once()
            MockArchivistAgent.assert_called_once()
            self.assertFalse(orchestrator.is_running)
            self.assertIsNone(orchestrator.thread)

    @patch('agents.orchestrator.read_file')
    @patch('agents.orchestrator.DistillerAgent')
    @patch('agents.orchestrator.ArchivistAgent')
    @patch('time.sleep', return_value=None) # Mock time.sleep to speed up tests
    def test_run_cycle(self, mock_sleep, MockArchivistAgent, MockDistillerAgent, mock_read_file_content):
        """
        Test the _run_cycle method, ensuring agents are called with correct arguments.
        """
        # Re-initialize orchestrator with the patched agents
        orchestrator = AgentOrchestrator()
        orchestrator.distiller = MockDistillerAgent.return_value
        orchestrator.archivist = MockArchivistAgent.return_value

        # Simulate read_file_content returning mock data
        mock_read_file_content.return_value = "Mock context data for distillation."

        # Set is_running to True for one cycle
        orchestrator.is_running = True

        # Call _run_cycle directly (it will run once due to is_running being set to False after the loop)
        # We need to run it in a separate thread as it contains a while loop
        cycle_thread = threading.Thread(target=orchestrator._run_cycle)
        cycle_thread.start()

        # Give the thread a moment to execute the first part of the loop
        time.sleep(0.1)

        # Assert that read_file_content was called with the correct path
        mock_read_file_content.assert_called_once_with(WORKING_MEMORY_PATH)

        # Assert that orchestrate_distillation_crew was called on the mocked DistillerAgent
        orchestrator.distiller.orchestrate_distillation_crew.assert_called_once_with("Mock context data for distillation.")

        # Assert that archive_from_working_memory was called on the mocked ArchivistAgent
        orchestrator.archivist.archive_from_working_memory.assert_called_once_with(WORKING_MEMORY_PATH, ARCHIVE_CHUNK_SIZE)

        # Set is_running to False to stop the loop in the thread
        orchestrator.is_running = False
        cycle_thread.join(timeout=1) # Wait for the thread to finish

        # Test case where context_to_distill is empty
        mock_read_file_content.reset_mock()
        orchestrator.distiller.orchestrate_distillation_crew.reset_mock()
        orchestrator.archivist.archive_from_working_memory.reset_mock()

        mock_read_file_content.return_value = ""
        orchestrator.is_running = True
        cycle_thread_empty = threading.Thread(target=orchestrator._run_cycle)
        cycle_thread_empty.start()
        time.sleep(0.1)

        mock_read_file_content.assert_called_once_with(WORKING_MEMORY_PATH)
        orchestrator.distiller.orchestrate_distillation_crew.assert_not_called()
        orchestrator.archivist.archive_from_working_memory.assert_not_called()

        orchestrator.is_running = False
        cycle_thread_empty.join(timeout=1)


    def test_start_and_stop(self):
        """
        Test the start and stop methods to ensure the is_running flag is managed correctly
        and that a thread is created.
        """
        # Initial state
        self.assertFalse(self.orchestrator.is_running)
        self.assertIsNone(self.orchestrator.thread)

        # Start the orchestrator
        self.orchestrator.start()
        self.assertTrue(self.orchestrator.is_running)
        self.assertIsNotNone(self.orchestrator.thread)
        self.assertTrue(self.orchestrator.thread.is_alive())

        # Try starting again (should do nothing)
        self.orchestrator.start()
        self.assertTrue(self.orchestrator.is_running) # Should still be true
        self.assertTrue(self.orchestrator.thread.is_alive()) # Should still be alive

        # Stop the orchestrator
        self.orchestrator.stop()
        self.assertFalse(self.orchestrator.is_running)
        # Give the thread a moment to recognize the stop signal
        time.sleep(0.1)
        # The thread might not terminate immediately, but is_running should be False

        # Try stopping again (should do nothing)
        self.orchestrator.stop()
        self.assertFalse(self.orchestrator.is_running)

        # Clean up the thread if it's still alive
        if self.orchestrator.thread and self.orchestrator.thread.is_alive():
            self.orchestrator.thread.join(timeout=1) # Wait for the thread to finish

if __name__ == '__main__':
    unittest.main()
