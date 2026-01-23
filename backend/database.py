"""
Mock database implementation for development/testing without MongoDB.
"""

from config import get_settings

settings = get_settings()

# In-memory mock storage
_mock_db = {
    "documents": [],
    "chunks": [],
    "concepts": [],
    "relationships": [],
    "users": []
}


class MockCollection:
    """Mock MongoDB collection that stores data in memory."""
    
    def __init__(self, name: str):
        self.name = name
    
    async def insert_one(self, doc: dict):
        from bson import ObjectId
        doc["_id"] = ObjectId()
        _mock_db[self.name].append(doc)
        
        class InsertResult:
            def __init__(self, id):
                self.inserted_id = id
        
        return InsertResult(doc["_id"])
    
    async def find_one(self, query: dict):
        for doc in _mock_db[self.name]:
            match = True
            for key, value in query.items():
                if doc.get(key) != value:
                    match = False
                    break
            if match:
                return doc
        return None
    
    async def update_one(self, query: dict, update: dict):
        doc = await self.find_one(query)
        if doc and "$set" in update:
            doc.update(update["$set"])
    
    def find(self, query: dict = None):
        return MockCursor(self.name, query or {})


class MockCursor:
    """Mock MongoDB cursor."""
    
    def __init__(self, collection_name: str, query: dict):
        self.collection_name = collection_name
        self.query = query
        self._limit = None
        self._sort = None
    
    def sort(self, field: str, direction: int):
        self._sort = (field, direction)
        return self
    
    def limit(self, n: int):
        self._limit = n
        return self
    
    def __aiter__(self):
        return self
    
    async def __anext__(self):
        if not hasattr(self, '_results'):
            results = []
            for doc in _mock_db[self.collection_name]:
                match = True
                for key, value in self.query.items():
                    if doc.get(key) != value:
                        match = False
                        break
                if match:
                    results.append(doc)
            
            if self._limit:
                results = results[:self._limit]
            
            self._results = iter(results)
        
        try:
            return next(self._results)
        except StopIteration:
            raise StopAsyncIteration


class MockDatabase:
    """Mock MongoDB database."""
    
    def __init__(self):
        self.documents = MockCollection("documents")
        self.chunks = MockCollection("chunks")
        self.concepts = MockCollection("concepts")
        self.relationships = MockCollection("relationships")
        self.users = MockCollection("users")


# Global mock database instance
db = MockDatabase()


async def connect_to_mongo():
    """Mock connection - just prints a message."""
    print(f"[MOCK MODE] Using in-memory database (MongoDB bypassed)")


async def close_mongo_connection():
    """Mock close - just prints a message."""
    print("[MOCK MODE] Mock database connection closed")


def get_database():
    """Return the mock database."""
    return db
