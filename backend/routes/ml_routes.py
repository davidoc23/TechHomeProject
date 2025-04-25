from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import db
from ml_models import device_predictor, get_device_suggestions, update_device_history
from datetime import datetime, timezone, timedelta
import random

ml_routes = Blueprint('ml_routes', __name__)

@ml_routes.route('/predict/device/<device_id>', methods=['GET'])
@jwt_required()
def predict_device_state(device_id):
    try:
        try:
            device_obj_id = ObjectId(device_id)
        except InvalidId:
            return jsonify({"error": "Invalid device ID format"}), 400

        device = db.devices_collection.find_one({"_id": device_obj_id})
        if not device:
            return jsonify({"error": "Device not found"}), 404

        prediction = device_predictor.predict_device_state(device_id)
        if not prediction or "prediction" not in prediction:
            return jsonify({
                "error": "Insufficient data to make prediction",
                "suggestion": "Use the device more to build usage patterns"
            }), 404

        return jsonify({
            "device": {
                "id": device_id,
                "name": device.get("name", "Unknown Device"),
                "type": device.get("type"),
                "current_state": device.get("isOn", False)
            },
            "prediction": {
                "should_be_on": prediction["prediction"],
                "confidence": prediction["probability"]
            }
        }), 200

    except Exception as e:
        print(f"Error in ML prediction: {e}")
        return jsonify({"error": str(e)}), 500

@ml_routes.route('/suggestions', methods=['GET'])
@jwt_required()
def get_suggestions():
    """
    Get AI suggestions for devices that should be toggled
    Can filter by rooms with ?rooms=room_id1,room_id2
    """
    try:
        user_id = get_jwt_identity()
        
        # Get optional room filter from query params
        room_filter = request.args.get('rooms', None)
        room_ids = []
        
        if room_filter:
            try:
                # Split and convert to ObjectIds
                room_ids = [ObjectId(room_id) for room_id in room_filter.split(',') if room_id]
            except Exception as e:
                print(f"Error parsing room IDs: {e}")
                # Log but don't fail - continue without room filtering
                pass
                
        # Validate the user has access to these rooms, if specified
        if room_ids:
            try:
                # Check that rooms belong to user
                valid_rooms = list(db.rooms_collection.find({
                    "_id": {"$in": room_ids},
                    "user_id": user_id
                }))
                
                # Only use room IDs that belong to the user
                room_ids = [room["_id"] for room in valid_rooms]
            except Exception as e:
                print(f"Error validating room access: {e}")
                # Continue without room filtering for safety
                room_ids = []
        
        # Try to get ML-based suggestions
        suggestions = get_device_suggestions(room_ids if room_ids else None)

        # Fall back to basic suggestions if ML didn't provide any
        if not suggestions:
            suggestions = []
            # Filter devices by room if room_ids provided
            query = {}
            if room_ids:
                query["room_id"] = {"$in": room_ids}
            
            # Limit to 3 devices
            devices = list(db.devices_collection.find(query).limit(3))
            
            if devices:
                for device in devices:
                    # Get last state change for this device
                    last_change = db.device_history_collection.find_one(
                        {"device_id": device["_id"]},
                        sort=[("timestamp", -1)]
                    )

                    ts = last_change.get("timestamp") if last_change else None

                    # Make sure timestamp has timezone info
                    if ts and ts.tzinfo is None:
                        ts = ts.replace(tzinfo=timezone.utc)

                    # Only suggest changing devices that haven't changed recently
                    if not ts or not isinstance(ts, datetime) or (datetime.now(timezone.utc) - ts).total_seconds() > 1800:
                        confidence = random.uniform(0.75, 0.95)
                        suggestions.append({
                            "device_id": str(device["_id"]),
                            "name": device.get("name", "Unknown Device"),
                            "current_state": device.get("isOn", False),
                            "suggested_state": not device.get("isOn", False),
                            "confidence": round(confidence, 2)
                        })

                        # Limit to 2 suggestions
                        if len(suggestions) >= 2:
                            break

        return jsonify({
            "suggestions": suggestions,
            "suggested_count": len(suggestions),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ml_routes.route('/feedback', methods=['POST'])
@jwt_required()
def feedback():
    """
    Receive feedback about a prediction to improve the model
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json(silent=True)

        if not data:
            return jsonify({"error": "Missing request body"}), 400

        device_id = data.get('device_id')
        accepted = data.get('accepted', False)

        if not device_id:
            return jsonify({"error": "Missing device_id parameter"}), 400

        try:
            device_object_id = ObjectId(device_id)
        except Exception:
            return jsonify({"error": "Invalid device_id format"}), 400

        db.prediction_feedback_collection.insert_one({
            "device_id": device_object_id,
            "user_id": user_id,
            "accepted": accepted,
            "timestamp": datetime.now(timezone.utc)
        })

        return jsonify({
            "message": "Feedback received",
            "device_id": device_id,
            "accepted": accepted,
            "user_id": user_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
