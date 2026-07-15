import os
import json
import uuid
from datetime import datetime
import pymongo
from pymongo.errors import ConnectionFailure
from app.config import settings

class JSONCollection:
    """Mock MongoDB collection using local JSON files"""
    def __init__(self, filepath):
        self.filepath = filepath
        self._ensure_file()

    def _ensure_file(self):
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        if not os.path.exists(self.filepath):
            with open(self.filepath, 'w') as f:
                json.dump([], f)

    def _read_data(self):
        self._ensure_file()
        try:
            with open(self.filepath, 'r') as f:
                return json.load(f)
        except Exception:
            return []

    def _write_data(self, data):
        self._ensure_file()
        with open(self.filepath, 'w') as f:
            json.dump(data, f, default=str, indent=2)

    def insert_one(self, document):
        data = self._read_data()
        doc = document.copy()
        if '_id' not in doc:
            doc['_id'] = str(uuid.uuid4())
        # Ensure datetimes are formatted string
        for k, v in doc.items():
            if isinstance(v, datetime):
                doc[k] = v.isoformat()
        data.append(doc)
        self._write_data(data)
        return type('InsertResult', (), {'inserted_id': doc['_id']})()

    def insert_many(self, documents):
        data = self._read_data()
        inserted_ids = []
        for document in documents:
            doc = document.copy()
            if '_id' not in doc:
                doc['_id'] = str(uuid.uuid4())
            for k, v in doc.items():
                if isinstance(v, datetime):
                    doc[k] = v.isoformat()
            data.append(doc)
            inserted_ids.append(doc['_id'])
        self._write_data(data)
        return type('InsertManyResult', (), {'inserted_ids': inserted_ids})()

    def find(self, query=None, limit=0, sort=None):
        query = query or {}
        data = self._read_data()
        results = []
        
        for doc in data:
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
        data = self._read_data()
        updated_count = 0
        
        # Parse $set operators
        set_fields = update.get('$set', {})
        
        for doc in data:
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
                
        if updated_count > 0:
            self._write_data(data)
            
        return type('UpdateResult', (), {'modified_count': updated_count})()

    def count_documents(self, query=None):
        query = query or {}
        return len(self.find(query))

    def delete_many(self, query=None):
        query = query or {}
        data = self._read_data()
        original_len = len(data)
        
        new_data = []
        for doc in data:
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if not match:
                new_data.append(doc)
                
        deleted_count = original_len - len(new_data)
        if deleted_count > 0:
            self._write_data(new_data)
            
        return type('DeleteResult', (), {'deleted_count': deleted_count})()


class JSONDatabase:
    """Mock MongoDB database routing to JSONCollection classes"""
    def __init__(self, directory):
        self.directory = directory
        
    def __getitem__(self, name):
        filepath = os.path.join(self.directory, f"{name}.json")
        return JSONCollection(filepath)


class DatabaseManager:
    def __init__(self):
        self.client = None
        self.db = None
        self.use_fallback = False
        
        # Try connecting to MongoDB
        try:
            print(f"Connecting to MongoDB at: {settings.MONGO_URI}...")
            # Set short timeout (3 seconds) so it doesn't hang startup
            self.client = pymongo.MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=3000)
            # Trigger connection check
            self.client.admin.command('ping')
            self.db = self.client[settings.DB_NAME]
            print(f"Successfully connected to MongoDB database '{settings.DB_NAME}'.")
        except (ConnectionFailure, Exception) as e:
            print(f"MongoDB connection failed: {e}")
            print(f"Initializing JSON Fallback Database at: {settings.FALLBACK_DB_DIR}")
            self.use_fallback = True
            self.db = JSONDatabase(settings.FALLBACK_DB_DIR)

    def get_collection(self, name):
        if self.use_fallback:
            return self.db[name]
        return self.db[name]

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
