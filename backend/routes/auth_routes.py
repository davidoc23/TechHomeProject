from flask import Blueprint, request, jsonify
from passlib.hash import bcrypt
from bson.objectid import ObjectId
from email_validator import validate_email, EmailNotValidError
import re
import db

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
        
        user_id = str(result.inserted_id)
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': user_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500