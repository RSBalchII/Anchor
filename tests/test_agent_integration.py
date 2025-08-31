import pytest
import threading
import json
import time
from unittest.mock import patch
from agents.orchestrator import AgentOrchestrator
from agents.scout_agent import ScoutAgent
from tools.blackboard import Blackboard

# The mock_redis_client fixture is automatically applied from conftest.py

@pytest.fixture
def blackboard(mock_redis_client):
    """Fixture to provide a Blackboard instance with a mocked redis_client."""
    bb = Blackboard()
    bb.redis_client = mock_redis_client
    return bb

@patch('agents.scout_agent.scrape_website') # Mock the actual scraping
def test_orchestrator_tasks_scout_agent(mock_scrape, blackboard, mock_redis_client):
    # Arrange
    mock_scrape.return_value = {"status": "success", "result": "Mocked website content"}
    
    orchestrator = AgentOrchestrator()
    scout = ScoutAgent()
    
    # Set the client for the scout agent instance
    scout.redis_client = mock_redis_client

    # Launch scout agent in a background daemon thread
    scout_thread = threading.Thread(target=scout.start_scouting, daemon=True)
    scout_thread.start()

    # Give the scout thread a moment to start and block on blpop
    time.sleep(0.1)

    # Act
    # Manually trigger the orchestrator to post a task
    # This bypasses the orchestrator's own run loop for this test
    orchestrator.blackboard.post_task("scout_tasks", {"type": "web_scrape", "url": "http://example.com"})

    # Give the scout time to process the task and post a result
    time.sleep(0.1)

    # Assert
    # Check if the scout posted a result back to the blackboard
    # The mock_redis_client in conftest is configured to return a value for blpop,
    # so the scout thread will have received a task. Now we check rpush.
    mock_redis_client.rpush.assert_called()
    # Get the arguments of the last call to rpush
    last_call_args = mock_redis_client.rpush.call_args.args
    assert last_call_args[0] == 'blackboard_stream'
    result_json = json.loads(last_call_args[1])
    assert result_json['source_agent'] == 'ScoutAgent'
    assert result_json['content'] == "Mocked website content"

    # Stop the scout thread by posting a sentinel value (or just end the test)
    # For simplicity, we'll just let the test end and the daemon thread will be killed.