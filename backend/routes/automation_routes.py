from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from db import automations_collection, devices_collection, find_user_by_id

automation_routes = Blueprint('automations', __name__)

@automation_routes.route('/', methods=['GET'])
@jwt_required()
def get_automations():
    try:
        automations = list(automations_collection.find())
        for automation in automations:
            automation['id'] = str(automation['_id'])
            if 'deviceId' in automation and isinstance(automation['deviceId'], ObjectId):
                automation['deviceId'] = str(automation['deviceId'])
            del automation['_id']
        return jsonify(automations)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_routes.route('/', methods=['POST'])
@jwt_required()
def create_automation():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        required_fields = ['name', 'type', 'condition', 'action']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        if 'deviceId' in data and isinstance(data['deviceId'], str):
            try:
                data['deviceId'] = ObjectId(data['deviceId'])
            except Exception:
                return jsonify({"error": "Invalid deviceId format"}), 400

        new_automation = {
            "name": data['name'],
            "type": data['type'],
            "condition": data['condition'],
            "action": data['action'],
            "enabled": data.get('enabled', True)
        }

        result = automations_collection.insert_one(new_automation)
        new_automation['id'] = str(result.inserted_id)
        del new_automation['_id']

        return jsonify(new_automation), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_routes.route('/<automation_id>', methods=['PUT'])
@jwt_required()
def update_automation(automation_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        if 'deviceId' in data and isinstance(data['deviceId'], str):
            try:
                data['deviceId'] = ObjectId(data['deviceId'])
            except Exception:
                return jsonify({"error": "Invalid deviceId format"}), 400

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
@jwt_required()
def delete_automation(automation_id):
    try:
        result = automations_collection.delete_one({"_id": ObjectId(automation_id)})
        if result.deleted_count:
            return jsonify({"message": "Automation deleted successfully"}), 200
        return jsonify({"error": "Automation not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_routes.route('/<automation_id>/toggle', methods=['POST'])
@jwt_required()
def toggle_automation(automation_id):
    try:
        automation = automations_collection.find_one({"_id": ObjectId(automation_id)})
        if not automation:
            return jsonify({"error": "Automation not found"}), 404

        new_state = not automation.get('enabled', True)
        automations_collection.update_one(
            {"_id": ObjectId(automation_id)},
            {"$set": {"enabled": new_state}}
        )

        return jsonify({"enabled": new_state}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500