from dotenv import load_dotenv
import os
from datetime import timedelta
import secrets

load_dotenv()

# Database settings
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
DATABASE_NAME = 'SmartHomeSystem'

# Home Assistant integration
HOME_ASSISTANT_URL = os.getenv('HOME_ASSISTANT_URL')
HOME_ASSISTANT_TOKEN = os.getenv('HOME_ASSISTANT_TOKEN')

# Security settings
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', secrets.token_hex(32))
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
PASSWORD_SALT = os.getenv('PASSWORD_SALT', 'techhome_salt')  # Used for password hashing

# Admin user setup
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@techhome.local')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')  # Change in production!