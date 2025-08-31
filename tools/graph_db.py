from neo4j import GraphDatabase
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

class GraphDB:
    """
    A centralized class for all Neo4j database operations.
    """
    def __init__(self):
        """
        Initializes the Neo4j driver.
        """
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    def close(self):
        """
        Closes the Neo4j database connection.
        """
        self.driver.close()

    def query(self, query: str, parameters: dict = None):
        """
        Executes a Cypher query and returns the results.

        Args:
            query (str): The Cypher query string.
            parameters (dict, optional): Parameters for the query. Defaults to None.

        Returns:
            neo4j.Result: The result of the query.
        """
        with self.driver.session() as session:
            result = session.run(query, parameters)
            return result