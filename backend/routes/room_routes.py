from flask import Blueprint, jsonify, request
from db import rooms_collection, devices_collection
from bson import ObjectId

room_routes = Blueprint('rooms', __name__)

@room_routes.route('/', methods=['GET'])
def get_rooms():
    try:
        rooms = list(rooms_collection.find())
        for room in rooms:
            room['id'] = str(room['_id'])
            del room['_id']
        return jsonify(rooms)
    except Exception as e:
        return jsonify({"error": str(e)}), 500