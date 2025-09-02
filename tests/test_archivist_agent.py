import unittest
from unittest.mock import patch, MagicMock
from agents.archivist_agent import ArchivistAgent

class TestArchivistAgent(unittest.TestCase):

    @patch('agents.archivist_agent.GraphDB')
    @patch('agents.archivist_agent.Blackboard')
    def setUp(self, MockBlackboard, MockGraphDB):
        self.MockGraphDB = MockGraphDB
        self.mock_graph_db_instance = MockGraphDB.return_value
        self.MockBlackboard = MockBlackboard
        self.agent = ArchivistAgent()

    def test_init_instantiates_graphdb(self):
        self.MockGraphDB.assert_called_once()
        self.assertEqual(self.agent.graph_db, self.mock_graph_db_instance)

    def test_add_memory_node_calls_graph_db_query(self):
        content = "Test memory content."
        expected_query = "CREATE (m:Memory {content: $content, timestamp: timestamp()})"
        expected_params = {"content": content}

        self.agent.add_memory_node(content)

        self.mock_graph_db_instance.query.assert_called_once()
        args, kwargs = self.mock_graph_db_instance.query.call_args
        self.assertEqual(args[0], expected_query)
        self.assertEqual(args[1]["content"], expected_params["content"])

    @patch('agents.archivist_agent.ArchivistAgent.add_memory_node')
    @patch('agents.archivist_agent.read_last_n_chars')
    def test_archive_from_working_memory_calls_add_memory_node(self, mock_read_last_n_chars, mock_add_memory_node):
        working_memory_path = "/fake/path/to/memory.txt"
        chars_to_archive = 100
        mock_read_last_n_chars.return_value = "some content"

        self.agent.archive_from_working_memory(working_memory_path, chars_to_archive)

        mock_read_last_n_chars.assert_called_once_with(working_memory_path, chars_to_archive)
        mock_add_memory_node.assert_called_once_with("Archiving new memory.")

    def test_archive_from_working_memory_no_content(self):
        working_memory_path = "/fake/path/to/empty_memory.txt"
        chars_to_archive = 100
        # Patch read_last_n_chars directly in this test method
        with patch('agents.archivist_agent.read_last_n_chars', return_value="") as mock_read_last_n_chars_local:
            with patch('builtins.print') as mock_print:
                self.agent.archive_from_working_memory(working_memory_path, chars_to_archive)
                mock_read_last_n_chars_local.assert_called_once_with(working_memory_path, chars_to_archive)
                mock_print.assert_any_call("Working memory file is empty or could not be read. Nothing to archive.")