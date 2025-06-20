from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from config import MONGO_URI, DATABASE_NAME
from datetime import datetime, timezone

# Add local MongoDB URI
LOCAL_URI = 'mongodb://localhost:27017'

def get_database_connection():
    """Try Atlas first, fall back to local if needed"""
    try:
        # Try to connect to Atlas with a short timeout
        atlas_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Test the connection
        atlas_client.admin.command('ping')
        print("Connected to MongoDB Atlas")
        return atlas_client[DATABASE_NAME]
    except ServerSelectionTimeoutError:
        print("Could not connect to MongoDB Atlas, falling back to local MongoDB")
        # Try local connection
        local_client = MongoClient(LOCAL_URI)
        print("Connected to local MongoDB")
        return local_client[DATABASE_NAME]

# Get database connection
db = get_database_connection()

#Collections
devices_collection = db['devices']
rooms_collection = db['rooms']
automations_collection = db['automations']
users_collection = db['users']
refresh_tokens_collection = db['refresh_tokens']
device_history_collection = db['device_history']
prediction_feedback_collection = db['prediction_feedback']
device_logs = db['device_logs']

# Create indexes with error handling
try:
    # Create indexes for users collection
    users_collection.create_index("email", unique=True)
    users_collection.create_index("username", unique=True)

    # Create index for refresh tokens collection
    refresh_tokens_collection.create_index("user_id")
    refresh_tokens_collection.create_index("token", unique=True)
    refresh_tokens_collection.create_index("expires_at")
    
    print("Successfully created all indexes")
except Exception as e:
    print(f"Warning: Could not create one or more indexes: {e}")

try:
    # Test connection is still working
    client = MongoClient(db.client.address[0], db.client.address[1])
    client.admin.command('ping')
    print("Successfully connected to MongoDB")
except Exception as e:
    print(f"MongoDB connection error: {e}")


# Helper methods for user management
def create_user(username, email, password_hash, first_name=None, last_name=None, role="user"):
    """Create a new user in the database"""
    user = {
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "first_name": first_name,
        "last_name": last_name,
        "role": role,
        "created_at":datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "last_login": None,
        "is_active": True
    }
    return users_collection.insert_one(user)

def find_user_by_email(email):
    """Find a user by their email address"""
    return users_collection.find_one({"email": email})

def find_user_by_username(username):
    """Find a user by their username"""
    return users_collection.find_one({"username": username})

def find_user_by_id(user_id):
    """Find a user by their ID"""
    from bson.objectid import ObjectId
    return users_collection.find_one({"_id": ObjectId(user_id)})

def update_last_login(user_id):
    """Update the user's last login timestamp"""
    from bson.objectid import ObjectId
    return users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )

def store_refresh_token(user_id, token, expires_at):
    """Store a refresh token in the database"""
    
    # Extract the JWT ID (jti) from the token
    import jwt
    from config import JWT_SECRET_KEY
    
    try:
        decoded_token = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        token_jti = decoded_token.get('jti')
    except:
        # If we can't decode, just use the token itself as the key
        token_jti = token
    
    token_data = {
        "user_id": user_id,
        "token": token,
        "jti": token_jti,
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
        "is_revoked": False
    }
    return refresh_tokens_collection.insert_one(token_data)

def revoke_refresh_token(token):
    """Revoke a refresh token"""
    return refresh_tokens_collection.update_one(
        {"token": token},
        {"$set": {"is_revoked": True}}
    )

def find_refresh_token(jti):
    """Find a refresh token by its JTI (JWT ID)"""
    # First try to find by JTI
    token = refresh_tokens_collection.find_one({"jti": jti, "is_revoked": False})
    
    # If not found, try to find by the token string (backward compatibility)
    if not token:
        token = refresh_tokens_collection.find_one({"token": jti, "is_revoked": False})
        
    return token

def revoke_all_user_tokens(user_id):
    """Revoke all refresh tokens for a user"""
    return refresh_tokens_collection.update_many(
        {"user_id": user_id},
        {"$set": {"is_revoked": True}}
    )