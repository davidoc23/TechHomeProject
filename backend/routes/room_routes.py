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
    

@room_routes.route('/<room_id>', methods=['PUT'])
def update_room(room_id):
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({"error": "Room name required"}), 400

        result = rooms_collection.update_one(
            {"_id": ObjectId(room_id)},
            {"$set": {"name": data['name']}}
        )
        
        if result.modified_count:
            updated_room = rooms_collection.find_one({"_id": ObjectId(room_id)})
            updated_room['id'] = str(updated_room['_id'])
            del updated_room['_id']
            return jsonify(updated_room)
        return jsonify({"error": "Room not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@room_routes.route('/<room_id>', methods=['DELETE'])
def delete_room(room_id):
    try:
        # Check if room has devices
        devices = list(devices_collection.find({"roomId": ObjectId(room_id)}))
        if devices:
            return jsonify({"error": "Cannot delete room with devices"}), 400

        result = rooms_collection.delete_one({"_id": ObjectId(room_id)})
        if result.deleted_count:
            return jsonify({"message": "Room deleted successfully"}), 200
        return jsonify({"error": "Room not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@room_routes.route('/<room_id>/devices', methods=['GET'])
def get_room_devices(room_id):
    try:
        devices = list(devices_collection.find({"roomId": ObjectId(room_id)}))
        for device in devices:
            device['id'] = str(device['_id'])
            device['roomId'] = str(device['roomId'])
            del device['_id']
        return jsonify(devices)
    except Exception as e:
        return jsonify({"error": str(e)}), 500