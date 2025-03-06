from flask import Blueprint, jsonify, request
import requests
from config import HOME_ASSISTANT_URL, HOME_ASSISTANT_TOKEN

home_assistant_routes = Blueprint('home_assistant', __name__)

@home_assistant_routes.route('/states', methods=['GET'])
def get_home_assistant_states():
    print(f"HA URL: {HOME_ASSISTANT_URL}")
    print(f"HA Token: {HOME_ASSISTANT_TOKEN[:10]}... (truncated)")  # Avoid logging full token
    try:
        headers = {
            'Authorization': f'Bearer {HOME_ASSISTANT_TOKEN}',
            'Content-Type': 'application/json'
        }
        print("Sending request to HA...")
        response = requests.get(f'{HOME_ASSISTANT_URL}/api/states', headers=headers)
        response.raise_for_status()
        print("Request successful")
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500