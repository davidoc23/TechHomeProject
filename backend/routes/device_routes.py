from flask import Blueprint, jsonify, request
from bson import ObjectId
from db import devices_collection, rooms_collection
import requests

device_routes = Blueprint('devices', __name__)

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
            # Add roomId if it exists
            if 'roomId' in device:
                formatted_device['roomId'] = str(device['roomId'])
            # Add temperature if it exists
            if 'temperature' in device:
                formatted_device['temperature'] = device['temperature']
            # Add isHomeAssistant if it exists
            if 'isHomeAssistant' in device:
                formatted_device['isHomeAssistant'] = device['isHomeAssistant']
            # Add entityId if it exists
            if 'entityId' in device:
                formatted_device['entityId'] = device['entityId']
            formatted_devices.append(formatted_device)
            
        return jsonify(formatted_devices)
    except Exception as e:
        print(f"Error: {str(e)}")  # Debug log
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
def add_device():
    try:
        # DEBUG - 🔹 Log the raw HTTP request body before parsing
        # DEBUG - raw_data = request.data.decode('utf-8')
        # DEBUG - print("📩 Raw request body:", raw_data)  

        # 🔹 Force JSON parsing to catch missing fields
        data = request.get_json(force=True)
        # DEBUG - print("🔹 Parsed JSON:", data)  # Debugging

        if not data or 'name' not in data or 'type' not in data or 'roomId' not in data:
            return jsonify({"error": "Name, type, and roomId required"}), 400

        # Verify room exists
        room = rooms_collection.find_one({"_id": ObjectId(data['roomId'])})
        if not room:
            return jsonify({"error": "Room not found"}), 404
        
        # 🔹 Ensure fields exist and are correctly formatted
        new_device = {
            "name": data['name'],
            "type": data['type'],
            "roomId": ObjectId(data['roomId']),
            "isOn": bool(data.get('isOn', False)),  # Ensure boolean
            "isHomeAssistant": bool(data.get('isHomeAssistant', False)),  # Ensure boolean
            "entityId": str(data['entityId']) if 'entityId' in data and data['entityId'] else None,  
            "attributes": data['attributes'] if isinstance(data.get('attributes'), dict) else {},  
        }

        # Format response
        # DEBUG - print("✅ Processed device before insert:", new_device)

        result = devices_collection.insert_one(new_device)
        inserted_device = devices_collection.find_one({"_id": result.inserted_id})

        # DEBUG - print("✅ Inserted device in MongoDB:", inserted_device)

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


        return jsonify(response_device), 201
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({"error": "Failed to add device"}), 500

@device_routes.route('/<device_id>/toggle', methods=['POST'])
def toggle_device(device_id):
    try:
        print(f"Toggling device with ID: {device_id}")  # Debug log
        device = devices_collection.find_one({"_id": ObjectId(device_id)})
        if not device:
            return jsonify({"error": "Device not found"}), 404

        print(f"Device details: {device}")  # Debug log

        if device.get('isHomeAssistant'):
            print(f"Device is a Home Assistant device with entity ID: {device['entityId']}")  # Debug log
            entity_id = device['entityId']
            new_state = not device['isOn']
            service = 'turn_on' if new_state else 'turn_off'
            url = f"http://homeassistant.local:8123/api/services/{device['type']}/{service}"
            headers = {
                'Authorization': 'Bearer {HOME_ASSISTANT_TOKEN}',
                'Content-Type': 'application/json'
            }
            response = requests.post(url, json={"entity_id": entity_id}, headers=headers)
            print(f"Home Assistant response: {response.status_code}, {response.text}")  # Debug log
            if response.status_code != 200:
                return jsonify({"error": "Failed to toggle Home Assistant device"}), 500
        else:
            new_state = not device['isOn']
            devices_collection.update_one(
                {"_id": ObjectId(device_id)},
                {"$set": {"isOn": new_state}}
            )

        # Format response with roomId if it exists
        response_device = {
            "id": str(device['_id']),
            "name": device['name'],
            "type": device['type'],
            "isOn": new_state,
            "isHomeAssistant": device.get('isHomeAssistant', False),
            "entityId": device.get('entityId', None),
            "attributes": device.get('attributes', {})
        }
        if 'roomId' in device:
            response_device['roomId'] = str(device['roomId'])
        if 'temperature' in device:
            response_device['temperature'] = device['temperature']
        
        return jsonify(response_device)
    except Exception as e:
        print(f"Error: {str(e)}")  # Add debug logging
        return jsonify({"error": str(e)}), 500
    


@device_routes.route('/toggle-all-lights', methods=['POST'])
def toggle_all_lights():
    try:
        data = request.get_json()
        if 'desiredState' not in data:
            return jsonify({"error": "Desired state required"}), 400

        devices_collection.update_many(
            {"type": "light"},
            {"$set": {"isOn": data['desiredState']}}
        )
        
        devices = list(devices_collection.find({"type": "light"}))
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
            formatted_devices.append(formatted_device)
            
        return jsonify(formatted_devices), 200
    except Exception as e:
        print(f"Error: {str(e)}")  # Add debug logging
        return jsonify({"error": str(e)}), 500
    
    

@device_routes.route('/<device_id>/temperature', methods=['POST'])
def set_temperature(device_id):
    try:
        data = request.get_json()
        if not data or 'temperature' not in data:
            return jsonify({"error": "Temperature required"}), 400

        device = devices_collection.find_one({"_id": ObjectId(device_id)})
        if not device:
            return jsonify({"error": "Device not found"}), 404
        if device['type'] != 'thermostat':
            return jsonify({"error": "Not a thermostat"}), 400

        devices_collection.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": {"temperature": data['temperature']}}
        )
        
        device['temperature'] = data['temperature']
        device['id'] = str(device['_id'])
        del device['_id']
        
        return jsonify(device)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

    
@device_routes.route('/<device_id>', methods=['DELETE'])
def remove_device(device_id):
    try:
        result = devices_collection.delete_one({"_id": ObjectId(device_id)})
        if result.deleted_count:
            return jsonify({"message": "Device removed"}), 200
        return jsonify({"error": "Device not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500