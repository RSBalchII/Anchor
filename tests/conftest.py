# tests/conftest.py

import pytest
from unittest.mock import MagicMock

@pytest.fixture
def mock_redis_client(monkeypatch):
    """Mocks the redis.Redis client in the Blackboard class."""
    mock_client = MagicMock()
    # Mock methods that are called in the code
    mock_client.ping.return_value = True
    mock_client.rpush.return_value = 1
    mock_client.lpush.return_value = 1
    mock_client.blpop.return_value = (b'scout_tasks', b'{"type": "web_scrape", "url": "http://example.com"}')
    mock_client.lrange.return_value = [b'{"message": "test"}']
    mock_client.delete.return_value = 1

    # Patch the redis.Redis object within the blackboard module
    monkeypatch.setattr("tools.blackboard.redis.Redis", lambda *args, **kwargs: mock_client)
    
    return mock_client
