from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import rooms_collection, devices_collection, find_user_by_id
from bson import ObjectId

room_routes = Blueprint('rooms', __name__)

@room_routes.route('/', methods=['GET'])
@jwt_required()
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
@jwt_required()
def add_room():
    try:
        # Check if JSON content-type is set (but still parse even if not)
        if not request.is_json:
            print("Warning: Content-Type header is not set to application/json")
            
        # Parse JSON with force=True to allow parsing even without proper content-type
        data = request.get_json(force=True)
        
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
        print(f"Error adding room: {str(e)}")
        return jsonify({"error": str(e)}), 500
    

@room_routes.route('/<room_id>', methods=['PUT'])
@jwt_required()
def update_room(room_id):
    try:
        # Check if JSON content-type is set (but still parse even if not)
        if not request.is_json:
            print("Warning: Content-Type header is not set to application/json")
            
        # Parse JSON with force=True to allow parsing even without proper content-type
        data = request.get_json(force=True)
        
        if not data or 'name' not in data:
            return jsonify({"error": "Room name required"}), 400

        result = rooms_collection.update_one(
            {"_id": ObjectId(room_id)},
            {"$set": {"name": data['name']}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Room not found"}), 404

        updated_room = rooms_collection.find_one({"_id": ObjectId(room_id)})
        updated_room['id'] = str(updated_room['_id'])
        del updated_room['_id']
        return jsonify(updated_room)

    except Exception as e:
        print(f"Error updating room: {str(e)}")
        return jsonify({"error": str(e)}), 500

@room_routes.route('/<room_id>', methods=['DELETE'])
@jwt_required()
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
        print(f"Error deleting room: {str(e)}")
        return jsonify({"error": str(e)}), 500

@room_routes.route('/<room_id>/devices', methods=['GET'])
@jwt_required()
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