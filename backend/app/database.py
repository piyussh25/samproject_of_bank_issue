import uuid
from datetime import datetime
from app.config import settings

# Global In-Memory Database
_IN_MEMORY_DB = {
    "sessions": [],
    "alerts": [],
    "users": [],
    "threat_intel": []
}

class InMemoryCollection:
    """Mock MongoDB collection that stores data completely in-memory"""
    def __init__(self, name, db_dict):
        self.name = name
        self.db_dict = db_dict

    @property
    def data(self):
        return self.db_dict[self.name]

    @data.setter
    def data(self, value):
        self.db_dict[self.name] = value

    def insert_one(self, document):
        doc = document.copy()
        if '_id' not in doc:
            doc['_id'] = str(uuid.uuid4())
        # Ensure datetimes are formatted string
        for k, v in doc.items():
            if isinstance(v, datetime):
                doc[k] = v.isoformat()
        self.data.append(doc)
        return type('InsertResult', (), {'inserted_id': doc['_id']})()

    def insert_many(self, documents):
        inserted_ids = []
        for document in documents:
            doc = document.copy()
            if '_id' not in doc:
                doc['_id'] = str(uuid.uuid4())
            for k, v in doc.items():
                if isinstance(v, datetime):
                    doc[k] = v.isoformat()
            self.data.append(doc)
            inserted_ids.append(doc['_id'])
        return type('InsertManyResult', (), {'inserted_ids': inserted_ids})()

    def find(self, query=None, limit=0, sort=None):
        query = query or {}
        results = []
        
        for doc in self.data:
            match = True
            for k, v in query.items():
                # Handle simple equality matches and nested queries
                if k not in doc:
                    match = False
                    break
                
                # Check value equality
                val = doc[k]
                if isinstance(v, dict):
                    if '$gte' in v:
                        if not (val >= v['$gte']): match = False
                    if '$lte' in v:
                        if not (val <= v['$lte']): match = False
                    if '$in' in v:
                        if not (val in v['$in']): match = False
                    if '$eq' in v:
                        if not (val == v['$eq']): match = False
                else:
                    if val != v:
                        match = False
                        break
            if match:
                results.append(doc.copy())

        # Sort if requested
        if sort:
            # sort is list of tuples, e.g. [('login_time', -1)]
            for field, order in reversed(sort):
                reverse = True if order == -1 else False
                results.sort(key=lambda x: x.get(field, ""), reverse=reverse)

        # Limit if requested
        if limit > 0:
            results = results[:limit]
            
        return results

    def find_one(self, query=None):
        query = query or {}
        results = self.find(query, limit=1)
        return results[0] if results else None

    def update_one(self, query, update):
        updated_count = 0
        set_fields = update.get('$set', {})
        
        for doc in self.data:
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            
            if match:
                for fk, fv in set_fields.items():
                    if isinstance(fv, datetime):
                        doc[fk] = fv.isoformat()
                    else:
                        doc[fk] = fv
                updated_count += 1
                break  # update_one updates only the first matching document
                
        return type('UpdateResult', (), {'modified_count': updated_count})()

    def count_documents(self, query=None):
        query = query or {}
        return len(self.find(query))

    def delete_many(self, query=None):
        query = query or {}
        original_len = len(self.data)
        
        new_data = []
        for doc in self.data:
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if not match:
                new_data.append(doc)
                
        deleted_count = original_len - len(new_data)
        self.data = new_data
        return type('DeleteResult', (), {'deleted_count': deleted_count})()


class DatabaseManager:
    def __init__(self):
        print("Using completely database-free In-Memory Database.")
        self.db = _IN_MEMORY_DB

    def get_collection(self, name):
        return InMemoryCollection(name, self.db)


# Global DB Instance
db_manager = DatabaseManager()

# Helper accessors
def get_sessions_collection():
    return db_manager.get_collection("sessions")

def get_alerts_collection():
    return db_manager.get_collection("alerts")

def get_users_collection():
    return db_manager.get_collection("users")

def get_threat_intel_collection():
    return db_manager.get_collection("threat_intel")
