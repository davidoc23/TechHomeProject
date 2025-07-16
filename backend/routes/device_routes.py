import os
import requests
import db
from flask import Blueprint, jsonify, request
from bson import ObjectId
from bson.errors import InvalidId
from db import devices_collection, rooms_collection
from dotenv import load_dotenv
from models.device_log import log_device_action
from flask_jwt_extended import get_jwt_identity, jwt_required 

# Helper function to get user identity, defaulting to "system" if JWT is not available
def get_user_identity():
    try:
        user_id = get_jwt_identity()
        if not user_id:
            return "system"
        user = db.find_user_by_id(user_id)
        if user and 'username' in user:
            return user['username']
        else:
            return "unknown"
    except Exception:
        return "system"

# Import ML functionality (will gracefully skip if not available)
try:
    from ml_models import update_device_history
except ImportError:
    # Define a dummy function if ML module isn't available
    def update_device_history(device_id, state, user_id=None):
        pass

# Load environment variables
load_dotenv()

device_routes = Blueprint('devices', __name__)

HOME_ASSISTANT_URL = os.getenv("HOME_ASSISTANT_URL")
HOME_ASSISTANT_TOKEN = os.getenv("HOME_ASSISTANT_TOKEN")

# Fetch the current state of a device from Home Assistant
def get_homeassistant_state(entity_id):
    """
    Fetches and returns the current state of a Home Assistant entity.
    Optimized for faster response.
    """
    url = f"{HOME_ASSISTANT_URL}/api/states/{entity_id}"
    headers = {
        "Authorization": f"Bearer {HOME_ASSISTANT_TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        # Single request with short timeout
        response = requests.get(url, headers=headers, timeout=1)
        if response.status_code == 200:
            ha_data = response.json()
            return ha_data.get("state") == "on"  # Returns True if "on", False otherwise
        else:
            print(f" Warning: Could not fetch state for {entity_id}. HTTP {response.status_code}")
            return False
    except requests.exceptions.Timeout:
        print(f"Timeout fetching state for {entity_id}")
        return False
    except Exception as e:
        print(f"Error fetching Home Assistant state: {str(e)}")
        return False

@device_routes.route('/', methods=['GET'])
def get_devices():
    try:
        devices = list(devices_collection.find())
        formatted_devices = []
        for device in devices:
            formatted_device = {
                'id': str(device['_id']),
                'name': device['name'],
                'type': device['type'],
                'isOn': device['isOn']
            }
            
            if 'roomId' in device:
                formatted_device['roomId'] = str(device['roomId'])
            if 'temperature' in device:
                formatted_device['temperature'] = device['temperature']
            if 'isHomeAssistant' in device:
                formatted_device['isHomeAssistant'] = device['isHomeAssistant']
            if 'entityId' in device:
                formatted_device['entityId'] = device['entityId']
            formatted_devices.append(formatted_device)
            
        return jsonify(formatted_devices)
    except Exception as e:
        # DEBUG - print(f"Error: {str(e)}")  # Debug log
        return jsonify({"error": str(e)}), 500
    
@device_routes.route('/by-room/<room_id>', methods=['GET'])
def get_devices_by_room(room_id):
    try:
        devices = list(devices_collection.find({"roomId": ObjectId(room_id)}))
        for device in devices:
            device['id'] = str(device['_id'])
            device['roomId'] = str(device['roomId'])
            del device['_id']
        return jsonify(devices)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@device_routes.route('/', methods=['POST'])
@jwt_required()
def add_device():
    user = get_user_identity()
    try:
        # DEBUG - Log the raw HTTP request body before parsing
        # DEBUG - raw_data = request.data.decode('utf-8')
        # DEBUG - print(" Raw request body:", raw_data)  

        # DEBUG - Force JSON parsing to catch missing fields
        data = request.get_json(force=True)
        # DEBUG - print(" Parsed JSON:", data)  # Debugging

        if not data or 'name' not in data or 'type' not in data or 'roomId' not in data:
            return jsonify({"error": "Name, type, and roomId required"}), 400

        # Verify room exists
        room = rooms_collection.find_one({"_id": ObjectId(data['roomId'])})
        if not room:
            return jsonify({"error": "Room not found"}), 404
        
        # Fetch state from Home Assistant if device is HA-enabled
        is_on = False
        if data.get('isHomeAssistant') and 'entityId' in data:
            is_on = get_homeassistant_state(data['entityId'])

        # Ensure fields exist and are correctly formatted
        new_device = {
            "name": data['name'],
            "type": data['type'],
            "roomId": ObjectId(data['roomId']),
            "isOn": is_on,  # Ensure boolean
            "isHomeAssistant": bool(data.get('isHomeAssistant', False)),  # Ensure boolean
            "entityId": str(data['entityId']) if 'entityId' in data and data['entityId'] else None,  
            "attributes": data['attributes'] if isinstance(data.get('attributes'), dict) else {},  
        }

        # Format response
        # DEBUG - print(" Processed device before insert:", new_device)

        result = devices_collection.insert_one(new_device)
        inserted_device = devices_collection.find_one({"_id": result.inserted_id})

        # DEBUG - print(" Inserted device in MongoDB:", inserted_device)

        response_device = {
            "id": str(inserted_device['_id']),
            "name": inserted_device['name'],
            "type": inserted_device['type'],
            "roomId": str(inserted_device['roomId']),
            "isOn": inserted_device['isOn'],
            "isHomeAssistant": inserted_device['isHomeAssistant'],
            "entityId": inserted_device['entityId'],
            "attributes": inserted_device['attributes']
        }

        if 'temperature' in inserted_device:
            response_device['temperature'] = inserted_device['temperature']

        # Log success
        safe_log_device_action(
            user=user,
            device=str(inserted_device['_id']),
            action="add",
            result="success"
        )

        return jsonify(response_device), 201
    except Exception as e:
        # Log failure
        safe_log_device_action(
            user=user,
            device=data.get('name', 'unknown') if 'data' in locals() else "unknown",
            action="add",
            result=f"error: {str(e)}",
            is_error=True,
            error_type="device_creation_error"
        )
        # DEBUG - print(f" Error: {str(e)}")
        return jsonify({"error": "Failed to add device"}), 500

@device_routes.route('/<device_id>/toggle', methods=['POST'])
@jwt_required()
def toggle_device(device_id):
    # Get the user identity from JWT
    user = get_user_identity() 

    try:
        device_obj_id = ObjectId(device_id)
        device = devices_collection.find_one({"_id": device_obj_id})

        if not device:
            # DEBUG - print(f" Device {device_id} not found")
            # Log the error for device not found
            safe_log_device_action(
                user=user,
                device=device_id,
                action="toggle",
                result="error: device not found",
                is_error=True,
                error_type="device_not_found"
            )
            return jsonify({"error": "Device not found"}), 404

        new_state = not device.get('isOn', False)

        if device.get('isHomeAssistant'):
            entity_id = device["entityId"]
            ha_service = "turn_on" if new_state else "turn_off"
            ha_payload = {"entity_id": entity_id}
            ha_headers = {
                "Authorization": f"Bearer {HOME_ASSISTANT_TOKEN}",
                "Content-Type": "application/json"
            }
            ha_url = f"{HOME_ASSISTANT_URL}/api/services/light/{ha_service}"
            ha_response = requests.post(ha_url, json=ha_payload, headers=ha_headers, timeout=2)

            if ha_response.status_code != 200:
                # Log the Home Assistant error
                # DEBUG - print(f" Home Assistant error for {entity_id}: {ha_response.text}")
                safe_log_device_action(
                    user=user,
                    device=entity_id,
                    action="toggle",
                    result=f"error: Home Assistant error {ha_response.text}",
                    is_error=True,
                    error_type="home_assistant_error"
                )
                return jsonify({"error": f"Home Assistant error: {ha_response.text}"}), ha_response.status_code

        # Update the local database
        devices_collection.update_one(
            {"_id": device_obj_id},
            {"$set": {"isOn": new_state}}
        )

        updated_device = {
            "id": device_id,
            "name": device["name"],
            "type": device["type"],
            "roomId": str(device.get("roomId")) if device.get("roomId") else None,
            "isOn": new_state,
            "isHomeAssistant": device.get("isHomeAssistant", False),
            "entityId": device.get("entityId", None),
            "attributes": device.get("attributes", {})
        }

        # If the device is Home Assistant, update its state
        safe_log_device_action(
            user=user,
            device=device.get("entityId") if device.get("isHomeAssistant") else device_id,
            action="toggle",
            result="on" if new_state else "off"
        )

        return jsonify(updated_device), 200

    except InvalidId:
        # Log the error for invalid ObjectId
        # DEBUG - print(f" Invalid device ID format: {device_id}")
        safe_log_device_action(
            user=user,
            device=device_id,
            action="toggle",
            result="error: invalid device id"
        )
        return jsonify({"error": "Invalid device ID format"}), 400
    
    except Exception as e:
        # Log the error
        # DEBUG - print(f" Error toggling device {device_id}: {str(e)}")
        safe_log_device_action(
            user=user,
            device=device_id,
            action="toggle",
            result=f"error: {str(e)}"
        )
        return jsonify({"error": str(e)}), 500

@device_routes.route('/toggle-all-lights', methods=['POST'])
@jwt_required()
def toggle_all_lights():
    # Get the user identity from JWT
    user = get_user_identity()
    try:
        data = request.get_json()
        if 'desiredState' not in data:
            return jsonify({"error": "Desired state required"}), 400

        desired_state = data['desiredState']  # True = ON, False = OFF

        # Fetch all light devices
        lights = list(devices_collection.find({"type": "light"}))

        updated_lights = []

        for device in lights:
            if device.get('isHomeAssistant'):
                ha_payload = {"entity_id": device["entityId"]}
                ha_headers = {
                    "Authorization": f"Bearer {HOME_ASSISTANT_TOKEN}",
                    "Content-Type": "application/json"
                }
                ha_service = "turn_on" if desired_state else "turn_off"
                ha_url = f"{HOME_ASSISTANT_URL}/api/services/light/{ha_service}"

                ha_response = requests.post(ha_url, json=ha_payload, headers=ha_headers)

                # DEBUGGING MESSAGES
                if ha_response.status_code == 401:
                    print(f"ERROR: Unauthorized Home Assistant token for {device['entityId']}")
                    continue
                elif ha_response.status_code != 200:
                    print(f"WARNING: Failed to toggle {device['entityId']}. Response: {ha_response.text}")
                    continue

            # Update MongoDB state
            devices_collection.update_one(
                {"_id": ObjectId(device["_id"])},
                {"$set": {"isOn": desired_state}}
            )

            # Log each light toggle
            # DEBUG - print(f"Toggling device {device['name']} to {'ON' if desired_state else 'OFF'}")
            safe_log_device_action(
                user=user,
                device=device.get("entityId") if device.get("isHomeAssistant") else str(device["_id"]),
                action="toggle_all",
                result="on" if desired_state else "off"
            )
            
            # Record device state change for ML model
            try:
                user_id = request.headers.get('X-User-ID')
                update_device_history(str(device["_id"]), desired_state, user_id)
            except Exception as e:
                print(f"Warning: Failed to update device history for ML: {e}")

            # Append updated device state
            updated_lights.append({
                "id": str(device["_id"]),
                "name": device["name"],
                "type": device["type"],
                "isOn": desired_state
            })

        return jsonify(updated_lights), 200

    except Exception as e:
        # Log the error
        # DEBUG - print(f" Error toggling all lights: {str(e)}")
        safe_log_device_action(
            user=user,
            device="all_lights",
            action="toggle_all",
            result=f"error: {str(e)}"
        )
        # DEBUG - print(f" Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@device_routes.route('/<device_id>/temperature', methods=['POST'])
@jwt_required()
def set_temperature(device_id):
    # Get the user identity from JWT
    user = get_user_identity()
    try:
        device_obj_id = ObjectId(device_id)
        device = devices_collection.find_one({"_id": device_obj_id})

        if not device:
            # DEBUG - print(f" Device {device_id} not found")
            # Log the error for device not found
            safe_log_device_action(
                user=user,
                device=device_id,
                action="set_temperature",
                result="error: device not found"
            )
            return jsonify({"error": "Device not found"}), 404

        if device['type'] != 'thermostat':
            # DEBUG - print(f" Device {device_id} is not a thermostat")
            # Log the error for non-thermostat device
            safe_log_device_action(
                user=user,
                device=device_id,
                action="set_temperature",
                result="error: not a thermostat"
            )
            return jsonify({"error": "Not a thermostat"}), 400

        data = request.get_json()
        if not data or 'temperature' not in data:
            # DEBUG - print(" Temperature data missing")
            # Log the error for missing temperature data
            safe_log_device_action(
                user=user,
                device=device_id,
                action="set_temperature",
                result="error: temperature required"
            )
            return jsonify({"error": "Temperature required"}), 400

        devices_collection.update_one(
            {"_id": device_obj_id},
            {"$set": {"temperature": data['temperature']}}
        )

        updated_device = {
            "id": device_id,
            "name": device["name"],
            "type": device["type"],
            "roomId": str(device.get("roomId")) if device.get("roomId") else None,
            "temperature": data['temperature']
        }

        # If the device is Home Assistant, update its state
        safe_log_device_action(
            user=user,
            device=device_id,
            action="set_temperature",
            result=str(data['temperature'])
        )

        return jsonify(updated_device), 200

    except InvalidId:
        # Log the error for invalid ObjectId
        # DEBUG - print(f" Invalid device ID format: {device_id}")
        safe_log_device_action(
            user=user,
            device=device_id,
            action="set_temperature",
            result="error: invalid device id"
        )
        return jsonify({"error": "Invalid device ID format"}), 400
    except Exception as e:
        # Log the error
        # DEBUG - print(f" Error setting temperature for device {device_id}: {str(e)}")
        safe_log_device_action(
            user=user,
            device=device_id,
            action="set_temperature",
            result=f"error: {str(e)}"
        )
        return jsonify({"error": str(e)}), 500

@device_routes.route('/<device_id>', methods=['DELETE'])
@jwt_required()
def remove_device(device_id):
    # Get the user identity from JWT
    user = get_user_identity()
    try:
        result = devices_collection.delete_one({"_id": ObjectId(device_id)})

        if result.deleted_count:
            # If the device was successfully deleted, log the action
            safe_log_device_action(
                user=user,
                device=device_id,
                action="remove",
                result="success"
            )
            return jsonify({"message": "Device removed"}), 200

        # If no device was found, log the error
        safe_log_device_action(
            user=user,
            device=device_id,
            action="remove",
            result="error: device not found"
        )
        return jsonify({"error": "Device not found"}), 404

    except Exception as e:
        # Log each remove action, even if it fails
        # DEBUG - print(f" Error removing device {device_id}: {str(e)}")
        safe_log_device_action(
            user=user,
            device=device_id,
            action="remove",
            result=f"error: {str(e)}"
        )
        return jsonify({"error": str(e)}), 500
    
# Helper robust logger
def safe_log_device_action(user, device, action, result, is_error=False, error_type=None):
    try:
        user = user or "unknown"
        device = device or "unknown"
        action = action or "unknown"
        result = result or "unknown"
        log_device_action(
            user=user,
            device=device,
            action=action,
            result=result,
            is_error=is_error,
            error_type=error_type
        )
    except Exception as e:
        print(f"[Logging Error] {e}")