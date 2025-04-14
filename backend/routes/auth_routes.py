from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, 
    jwt_required, get_jwt_identity, get_jwt
)
from datetime import datetime, timezone
import db
from config import JWT_REFRESH_TOKEN_EXPIRES
from passlib.hash import bcrypt
from bson.objectid import ObjectId
from email_validator import validate_email, EmailNotValidError
import re

auth_routes = Blueprint('auth_routes', __name__)

def is_valid_username(username):
    """Check if username is valid (alphanumeric with underscores, 3-20 chars)"""
    return re.match(r'^[a-zA-Z0-9_]{3,20}$', username) is not None

def is_valid_password(password):
    """Check if password meets minimum requirements (8+ chars, 1+ digit, 1+ letter)"""
    if len(password) < 8:
        return False
    if not re.search(r'\d', password):  # at least one digit
        return False
    if not re.search(r'[a-zA-Z]', password):  # at least one letter
        return False
    return True

@auth_routes.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    print(f"Registration attempt with data: {data}")
    
    # Check if required fields are present
    required_fields = ['username', 'email', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    username = data['username']
    email = data['email']
    password = data['password']
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    
    # Validate username
    if not is_valid_username(username):
        return jsonify({'error': 'Username must be 3-20 characters and contain only letters, numbers, and underscores'}), 400
    
    # Validate email
    try:
        valid = validate_email(email)
        email = valid.email
    except EmailNotValidError as e:
        return jsonify({'error': str(e)}), 400
    
    # Validate password
    if not is_valid_password(password):
        return jsonify({'error': 'Password must be at least 8 characters and contain at least one letter and one number'}), 400
    
    # Check if user already exists
    if db.find_user_by_username(username):
        return jsonify({'error': 'Username already exists'}), 409
    
    if db.find_user_by_email(email):
        return jsonify({'error': 'Email already registered'}), 409
    
    # Hash the password
    password_hash = bcrypt.hash(password)
    
    # Create the user
    try:
        result = db.create_user(
            username=username,
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name
        )
        
        print(f"User creation result: {result}")
        user_id = str(result.inserted_id)
        print(f"New user created with ID: {user_id}")
        
        # Create tokens
        access_token = create_access_token(identity=user_id)
        refresh_token = create_refresh_token(identity=user_id)
        print(f"Tokens created for new user")
        
        # Store refresh token
        expires_at = datetime.now(timezone.utc) + JWT_REFRESH_TOKEN_EXPIRES
        db.store_refresh_token(user_id, refresh_token, expires_at)
        
        # Update last login
        db.update_last_login(user_id)
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': user_id,
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        print(f"Error during user creation: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@auth_routes.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    # Check if required fields are present
    if 'username' not in data and 'email' not in data:
        return jsonify({'error': 'Either username or email is required'}), 400
    if 'password' not in data:
        return jsonify({'error': 'Password is required'}), 400
    
    password = data['password']
    
    # Find user by username or email
    user = None
    if 'username' in data:
        user = db.find_user_by_username(data['username'])
    else:
        user = db.find_user_by_email(data['email'])
    
    # Check if user exists and password is correct
    if not user or not bcrypt.verify(password, user['password_hash']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Check if user is active
    if not user.get('is_active', True):
        return jsonify({'error': 'Account is disabled'}), 403
    
    user_id = str(user['_id'])
    
    # Create tokens
    access_token = create_access_token(identity=user_id)
    refresh_token = create_refresh_token(identity=user_id)
    
    # Store refresh token
    expires_at = datetime.now(timezone.utc) + JWT_REFRESH_TOKEN_EXPIRES
    db.store_refresh_token(user_id, refresh_token, expires_at)
    
    # Update last login
    db.update_last_login(user_id)
    
    return jsonify({
        'message': 'Login successful',
        'user_id': user_id,
        'username': user['username'],
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 200

@auth_routes.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    # Get user identity from JWT token
    user_id = get_jwt_identity()
    
    # Get JWT ID from token
    jti = get_jwt()["jti"]
    
    # Create new access token
    access_token = create_access_token(identity=user_id)
    
    return jsonify({
        'access_token': access_token
    }), 200

@auth_routes.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    refresh_token = request.json.get('refresh_token')
    
    if refresh_token:
        # Revoke the refresh token
        db.revoke_refresh_token(refresh_token)
    
    return jsonify({'message': 'Logout successful'}), 200

@auth_routes.route('/logout-all', methods=['POST'])
@jwt_required()
def logout_all():
    user_id = get_jwt_identity()
    
    # Revoke all refresh tokens for the user
    db.revoke_all_user_tokens(user_id)
    
    return jsonify({'message': 'Logged out from all devices'}), 200

@auth_routes.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    
    # Get the user data
    user = db.find_user_by_id(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Remove sensitive fields
    user.pop('password_hash', None)
    
    # Convert ObjectId to string for JSON serialization
    user['_id'] = str(user['_id'])
    
    # Convert datetime objects to strings
    for field in ['created_at', 'updated_at', 'last_login']:
        if field in user and user[field]:
            user[field] = user[field].isoformat()
    
    return jsonify(user), 200

@auth_routes.route('/me', methods=['PATCH'])
@jwt_required()
def update_current_user():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Get the user data
    user = db.find_user_by_id(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Fields that can be updated
    allowed_fields = ['first_name', 'last_name', 'email']
    update_data = {}
    
    for field in allowed_fields:
        if field in data:
            if field == 'email' and data[field] != user.get('email'):
                # Validate new email
                try:
                    valid = validate_email(data[field])
                    # Check if email is already in use
                    existing_user = db.find_user_by_email(valid.email)
                    if existing_user and str(existing_user['_id']) != user_id:
                        return jsonify({'error': 'Email already in use'}), 409
                    update_data[field] = valid.email
                except EmailNotValidError as e:
                    return jsonify({'error': str(e)}), 400
            else:
                update_data[field] = data[field]
    
    # Update password if provided
    if 'current_password' in data and 'new_password' in data:
        # Verify current password
        if not bcrypt.verify(data['current_password'], user['password_hash']):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Validate new password
        if not is_valid_password(data['new_password']):
            return jsonify({'error': 'New password must be at least 8 characters and contain at least one letter and one number'}), 400
        
        # Hash new password
        update_data['password_hash'] = bcrypt.hash(data['new_password'])
    
    # Update timestamp
    update_data['updated_at'] = datetime.utcnow()
    
    if update_data:
        # Update the user
        db.users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        return jsonify({'message': 'User updated successfully'}), 200
    
    return jsonify({'message': 'No changes to update'}), 200

@auth_routes.route('/initialize-admin', methods=['POST'])
def initialize_admin():
    """Initialize the admin user if no users exist yet"""
    from config import ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
    
    # Check if any users exist
    if db.users_collection.count_documents({}) > 0:
        return jsonify({'error': 'Users already exist, admin initialization not allowed'}), 403
    
    # Create admin user
    password_hash = bcrypt.hash(ADMIN_PASSWORD)
    
    try:
        result = db.create_user(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            password_hash=password_hash,
            role="admin"
        )
        
        admin_id = str(result.inserted_id)
        
        return jsonify({
            'message': 'Admin user initialized successfully',
            'user_id': admin_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Admin initialization failed: {str(e)}'}), 500