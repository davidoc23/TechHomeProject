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
    

@room_routes.route('/', methods=['POST'])
def add_room():
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({"error": "Room name required"}), 400
            
        new_room = {
            "name": data['name']
        }
        
        result = rooms_collection.insert_one(new_room)
        inserted_room = rooms_collection.find_one({"_id": result.inserted_id})
        inserted_room['id'] = str(inserted_room['_id'])
        del inserted_room['_id']
        
        return jsonify(inserted_room), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500