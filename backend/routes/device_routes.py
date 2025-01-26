from flask import Blueprint, jsonify, request
from flask_cors import CORS

device_routes = Blueprint('devices', __name__)
CORS(device_routes)

# Initial device state
devices = [
    {"id": 1, "name": "Living Room Light", "type": "light", "isOn": False},
    {"id": 2, "name": "Kitchen Light", "type": "light", "isOn": False},
    {"id": 3, "name": "Bedroom Light", "type": "light", "isOn": False},
    {"id": 4, "name": "Living Room Thermostat", "type": "thermostat", "temperature": 72, "isOn": True}
]

@device_routes.route('/', methods=['GET'])
def get_devices():
    try:
        return jsonify(devices), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@device_routes.route('/', methods=['POST'])
def add_device():
    try:
        data = request.get_json()
        required_fields = ['name', 'type']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        new_device = {
            "id": len(devices) + 1,
            "name": data['name'],
            "type": data['type'],
            "isOn": False
        }
        
        # Add temperature field for thermostats
        if data['type'] == 'thermostat':
            new_device['temperature'] = 72  # Default temperature

        devices.append(new_device)
        return jsonify(new_device), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@device_routes.route('/<int:device_id>/toggle', methods=['POST'])
def toggle_device(device_id):
    try:
        device = next((d for d in devices if d["id"] == device_id), None)
        if not device:
            return jsonify({"error": "Device not found"}), 404
            
        device["isOn"] = not device["isOn"]
        return jsonify(device), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@device_routes.route('/toggle-all-lights', methods=['POST'])
def toggle_all_lights():
    try:
        data = request.get_json()
        if 'desiredState' not in data:
            return jsonify({"error": "Desired state required"}), 400
            
        for device in devices:
            if device['type'] == 'light':
                device['isOn'] = data['desiredState']
                
        return jsonify(devices), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@device_routes.route('/<int:device_id>/temperature', methods=['POST'])
def set_temperature(device_id):
    try:
        data = request.get_json()
        if not data or 'temperature' not in data:
            return jsonify({"error": "Temperature value required"}), 400

        device = next((d for d in devices if d["id"] == device_id), None)
        if not device:
            return jsonify({"error": "Device not found"}), 404
        if device["type"] != "thermostat":
            return jsonify({"error": "Device is not a thermostat"}), 400

        device["temperature"] = data["temperature"]
        return jsonify(device), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@device_routes.route('/<int:device_id>', methods=['DELETE'])
def remove_device(device_id):
    try:
        device = next((d for d in devices if d["id"] == device_id), None)
        if not device:
            return jsonify({"error": "Device not found"}), 404
            
        devices.remove(device)
        return jsonify({"message": "Device removed successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500