from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
DATABASE_NAME = 'SmartHomeSystem'
HOME_ASSISTANT_URL = os.getenv('HOME_ASSISTANT_URL')
HOME_ASSISTANT_TOKEN = os.getenv('HOME_ASSISTANT_TOKEN')