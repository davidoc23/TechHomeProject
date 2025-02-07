from flask import Blueprint, jsonify, request
from bson import ObjectId
from db import automations_collection, devices_collection

automation_routes = Blueprint('automations', __name__)

@automation_routes.route('/', methods=['GET'])
def get_automations():
    try:
        automations = list(automations_collection.find())
        for automation in automations:
            automation['id'] = str(automation['_id'])
            if 'deviceId' in automation:
                automation['deviceId'] = str(automation['deviceId'])
            del automation['_id']
        return jsonify(automations)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@automation_routes.route('/', methods=['POST'])
def create_automation():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        required_fields = ['name', 'type', 'condition', 'action']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        # Convert device IDs to ObjectId
        if 'deviceId' in data:
            data['deviceId'] = ObjectId(data['deviceId'])

        new_automation = {
            "name": data['name'],
            "type": data['type'],  # time, device-link, or condition
            "condition": data['condition'],  # e.g., {"time": "18:00"} or {"deviceId": "123", "state": "on"}
            "action": data['action'],  # e.g., {"deviceId": "456", "command": "toggle", "value": true}
            "enabled": data.get('enabled', True)
        }

        result = automations_collection.insert_one(new_automation)
        new_automation['id'] = str(result.inserted_id)
        del new_automation['_id']
        
        return jsonify(new_automation), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@automation_routes.route('/<automation_id>', methods=['PUT'])
def update_automation(automation_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Convert device IDs to ObjectId
        if 'deviceId' in data:
            data['deviceId'] = ObjectId(data['deviceId'])

        result = automations_collection.update_one(
            {"_id": ObjectId(automation_id)},
            {"$set": data}
        )

        if result.modified_count:
            automation = automations_collection.find_one({"_id": ObjectId(automation_id)})
            automation['id'] = str(automation['_id'])
            del automation['_id']
            return jsonify(automation)
        return jsonify({"error": "Automation not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@automation_routes.route('/<automation_id>', methods=['DELETE'])
def delete_automation(automation_id):
    try:
        result = automations_collection.delete_one({"_id": ObjectId(automation_id)})
        if result.deleted_count:
            return jsonify({"message": "Automation deleted successfully"}), 200
        return jsonify({"error": "Automation not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

