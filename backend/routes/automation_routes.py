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
