import unittest
from unittest.mock import patch, MagicMock
from tools.graph_db import GraphDB
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

class TestGraphDB(unittest.TestCase):

    def setUp(self):
        patcher = patch('tools.graph_db.GraphDatabase.driver')
        self.mock_driver_constructor = patcher.start()
        self.mock_driver = MagicMock()
        self.mock_driver_constructor.return_value = self.mock_driver
        self.addCleanup(patcher.stop)

        self.graph_db = GraphDB()

    def test_init_correctly_initializes_driver(self):
        self.mock_driver_constructor.assert_called_once_with(
            NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        self.assertEqual(self.graph_db.driver, self.mock_driver)

    def test_close_calls_driver_close(self):
        self.graph_db.close()
        self.mock_driver.close.assert_called_once()

    def test_query_executes_cypher_and_returns_result(self):
        mock_session = MagicMock()
        self.mock_driver.session.return_value.__enter__.return_value = mock_session
        mock_result = MagicMock()
        mock_session.run.return_value = mock_result

        test_query = "MATCH (n) RETURN n"
        test_params = {"param1": "value1"}

        result = self.graph_db.query(test_query, test_params)

        self.mock_driver.session.assert_called_once()
        mock_session.run.assert_called_once_with(test_query, test_params)
        self.assertEqual(result, mock_result)

    def test_query_with_no_parameters(self):
        mock_session = MagicMock()
        self.mock_driver.session.return_value.__enter__.return_value = mock_session
        mock_result = MagicMock()
        mock_session.run.return_value = mock_result

        test_query = "MATCH (n) RETURN n"

        result = self.graph_db.query(test_query)

        self.mock_driver.session.assert_called_once()
        mock_session.run.assert_called_once_with(test_query, None)
        self.assertEqual(result, mock_result)