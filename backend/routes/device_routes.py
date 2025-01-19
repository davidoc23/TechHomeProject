# routes/device_routes.py
from flask import Blueprint, jsonify, request

device_routes = Blueprint('devices', __name__)

# Temporary device storage (will replace with MongoDB later)
devices = [
    {"id": 1, "name": "Living Room Light", "type": "light", "isOn": False},
    {"id": 2, "name": "Kitchen Light", "type": "light", "isOn": False},
    {"id": 3, "name": "Bedroom Light", "type": "light", "isOn": False},
    {"id": 4, "name": "Living Room Thermostat", "type": "thermostat", "temperature": 72, "isOn": True}
]

@device_routes.route('/', methods=['GET'])
def get_devices():
    return jsonify(devices)

@device_routes.route('/<int:device_id>/toggle', methods=['POST'])
def toggle_device(device_id):
    device = next((d for d in devices if d["id"] == device_id), None)
    if device:
        device["isOn"] = not device["isOn"]
        return jsonify(device)
    return jsonify({"error": "Device not found"}), 404

@device_routes.route('/<int:device_id>/temperature', methods=['POST'])
def set_temperature(device_id):
    data = request.get_json()
    device = next((d for d in devices if d["id"] == device_id), None)
    if device and device["type"] == "thermostat":
        device["temperature"] = data["temperature"]
        return jsonify(device)
    return jsonify({"error": "Device not found or not a thermostat"}), 404