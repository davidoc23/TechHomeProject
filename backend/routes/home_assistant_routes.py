from flask import Blueprint, jsonify, request
import requests
from config import HOME_ASSISTANT_URL, HOME_ASSISTANT_TOKEN

home_assistant_routes = Blueprint('home_assistant', __name__)

@home_assistant_routes.route('/states', methods=['GET'])
def get_home_assistant_states():
    try:
        headers = {
            'Authorization': f'Bearer {HOME_ASSISTANT_TOKEN}',
            'Content-Type': 'application/json'
        }
        response = requests.get(f'{HOME_ASSISTANT_URL}/api/states', headers=headers)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500
