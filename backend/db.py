from pymongo import MongoClient
from config import MONGO_URI, DATABASE_NAME

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
devices_collection = db['devices']
rooms_collection = db['rooms']
automations_collection = db['automations']



try:
    client.admin.command('ping')
    print("Successfully connected to MongoDB")
except Exception as e:
    print(f"MongoDB connection error: {e}")