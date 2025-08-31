import pytest
import json
from tools.blackboard import Blackboard

# The mock_redis_client fixture is automatically applied from conftest.py

@pytest.fixture
def blackboard(mock_redis_client):
    """Fixture to provide a Blackboard instance with a mocked redis_client."""
    bb = Blackboard()
    # The client is already mocked by the autouse fixture, but we can re-assert it for clarity
    bb.redis_client = mock_redis_client 
    return bb

def test_post_message(blackboard, mock_redis_client):
    source_agent = "TestAgent"
    content = "This is a test message."
    blackboard.post_message(source_agent, content)

    # Assert that the rpush method was called on the mock client with the correct arguments
    mock_redis_client.rpush.assert_called_once()
    args, _ = mock_redis_client.rpush.call_args
    assert args[0] == 'blackboard_stream'
    message_data = json.loads(args[1])
    assert message_data['source_agent'] == source_agent
    assert message_data['content'] == content

def test_read_latest_messages(blackboard, mock_redis_client):
    # Configure the mock to return a sample message list
    mock_redis_client.lrange.return_value = [
        json.dumps({'source_agent': 'Agent1', 'content': 'Message 1'}).encode('utf-8')
    ]
    
    messages = blackboard.read_latest_messages(1)
    
    # Assert that lrange was called correctly
    mock_redis_client.lrange.assert_called_once_with('blackboard_stream', -1, -1)
    
    # Assert that the message was decoded correctly
    assert len(messages) == 1
    assert messages[0]["source_agent"] == "Agent1"

def test_post_task(blackboard, mock_redis_client):
    queue_name = "scout_tasks"
    task_data = {"type": "web_scrape", "url": "http://example.com"}
    blackboard.post_task(queue_name, task_data)

    # Assert that lpush was called on the mock client with the correct arguments
    mock_redis_client.lpush.assert_called_once()
    args, _ = mock_redis_client.lpush.call_args
    assert args[0] == queue_name
    assert json.loads(args[1]) == task_data