from flask import Blueprint, jsonify, request
from bson import ObjectId
from db import devices_collection

device_routes = Blueprint('devices', __name__)

@device_routes.route('/', methods=['GET'])
def get_devices():
    try:
        devices = list(devices_collection.find())
        for device in devices:
            device['id'] = str(device['_id'])
            del device['_id']
        return jsonify(devices)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@device_routes.route('/', methods=['POST'])
def add_device():
    try:
        data = request.get_json()
        new_device = {
            "name": data['name'],
            "type": data['type'],
            "isOn": False
        }
        
        # Insert and get the new device
        result = devices_collection.insert_one(new_device)
        inserted_device = devices_collection.find_one({"_id": result.inserted_id})
        
        # Format for response
        inserted_device['id'] = str(inserted_device['_id'])
        del inserted_device['_id']
        
        return jsonify(inserted_device), 201
    except Exception as e:
        print(f"Error: {str(e)}")  # Debug log
        return jsonify({"error": "Failed to add device"}), 500
    

@device_routes.route('/<device_id>/toggle', methods=['POST'])
def toggle_device(device_id):
    try:
        device = devices_collection.find_one({"_id": ObjectId(device_id)})
        if not device:
            return jsonify({"error": "Device not found"}), 404
            
        new_state = not device['isOn']
        devices_collection.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": {"isOn": new_state}}
        )
        
        device['isOn'] = new_state
        device['id'] = str(device['_id'])
        del device['_id']
        
        return jsonify(device)
    except Exception as e:
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
        for device in devices:
            device['id'] = str(device['_id'])
            del device['_id']
            
        return jsonify(devices), 200
    except Exception as e:
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