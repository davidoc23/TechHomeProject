from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
from config import HOME_ASSISTANT_URL, HOME_ASSISTANT_TOKEN
from db import find_user_by_id, devices_collection
from bson import ObjectId

home_assistant_routes = Blueprint('home_assistant', __name__)

@home_assistant_routes.route('/states', methods=['GET'])
@jwt_required()
def get_home_assistant_states():
    print(f"HA URL: {HOME_ASSISTANT_URL}")
    print(f"HA Token: {HOME_ASSISTANT_TOKEN[:10]}... (truncated)")  # Avoid logging full token
    try:
        headers = {
            'Authorization': f'Bearer {HOME_ASSISTANT_TOKEN}',
            'Content-Type': 'application/json'
        }
        print("Sending request to HA...")
        response = requests.get(f'{HOME_ASSISTANT_URL}/api/states', headers=headers, timeout=1.5)
        response.raise_for_status()
        print("Request successful")
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@home_assistant_routes.route('/toggle/<entity_id>', methods=['POST'])
@jwt_required()
def toggle_ha_device(entity_id):
    try:
        print(f"Toggling Home Assistant entity: {entity_id}")
        
        # Find device in database to know the current state
        device = devices_collection.find_one({"entityId": entity_id, "isHomeAssistant": True})
        
        # If we have the device in our database, use its state, otherwise query HA
        if device:
            current_state = device.get('isOn', False)
            new_state = not current_state
            device_id = str(device['_id'])
            print(f"Found device in DB with current state: {current_state}")
        else:
            # We don't know the device state, so query Home Assistant
            print(f"Device not found in DB, querying current state from HA")
            try:
                headers = {
                    'Authorization': f'Bearer {HOME_ASSISTANT_TOKEN}',
                    'Content-Type': 'application/json'
                }
                response = requests.get(f'{HOME_ASSISTANT_URL}/api/states/{entity_id}', 
                                       headers=headers, timeout=1)
                
                if response.status_code == 200:
                    ha_data = response.json()
                    current_state = ha_data.get("state") == "on"
                    new_state = not current_state
                    device_id = None
                else:
                    return jsonify({"error": f"Failed to get state for {entity_id}"}), response.status_code
            except Exception as e:
                print(f"Error getting state: {str(e)}")
                return jsonify({"error": str(e)}), 500
        
        # Determine which service to call
        ha_service = "turn_on" if new_state else "turn_off"
        
        # Set up HA request
        ha_payload = {"entity_id": entity_id}
        ha_headers = {
            "Authorization": f"Bearer {HOME_ASSISTANT_TOKEN}",
            "Content-Type": "application/json"
        }
        ha_url = f"{HOME_ASSISTANT_URL}/api/services/light/{ha_service}"
        
        # Send command with shorter timeout
        print(f"Sending {ha_service} command to Home Assistant")
        ha_response = requests.post(ha_url, json=ha_payload, headers=ha_headers, timeout=1)
        
        if ha_response.status_code == 401:
            print(f"ERROR: Unauthorized Home Assistant token")
            return jsonify({"error": "Unauthorized - Invalid Home Assistant token"}), 401
            
        if ha_response.status_code != 200:
            print(f"WARNING: Failed to toggle {entity_id}. Response: {ha_response.text}")
            return jsonify({"error": f"Failed to toggle Home Assistant device"}), ha_response.status_code
            
        # Update our database if we have the device
        if device_id:
            print(f"Updating database for device {device_id}")
            devices_collection.update_one(
                {"_id": ObjectId(device_id)},
                {"$set": {"isOn": new_state}}
            )
            
        return jsonify({
            "success": True,
            "entity_id": entity_id,
            "new_state": "on" if new_state else "off"
        })
        
    except Exception as e:
        print(f"Error toggling device: {str(e)}")
        return jsonify({"error": str(e)}), 500