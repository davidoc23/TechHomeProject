from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import db
from ml_models import device_predictor, get_device_suggestions, update_device_history
from datetime import datetime, timedelta

ml_routes = Blueprint('ml_routes', __name__)

@ml_routes.route('/predict/device/<device_id>', methods=['GET'])
@jwt_required()
def predict_device_state(device_id):
    """
    Predict if a device should be on or off based on usage patterns
    """
    try:
        # Verify device exists
        device = db.devices_collection.find_one({"_id": ObjectId(device_id)})
        if not device:
            return jsonify({"error": "Device not found"}), 404
            
        # Get prediction
        prediction = device_predictor.predict_device_state(device_id)
        
        if prediction is None:
            return jsonify({
                "error": "Insufficient data to make prediction",
                "suggestion": "Use the device more to build usage patterns"
            }), 404
            
        # Return prediction with device info
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
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ml_routes.route('/suggestions', methods=['GET'])
# Temporarily remove JWT requirement for testing
# @jwt_required()
def get_suggestions():
    """
    Get AI suggestions for devices that should be toggled
    """
    try:
        # Get real suggestions if available
        suggestions = get_device_suggestions()
        
        # If no real suggestions, provide mock data for testing
        if not suggestions:
            # Get a random device to suggest
            devices = list(db.devices_collection.find(limit=3))
            if devices:
                for device in devices:
                    suggestions.append({
                        "device_id": str(device["_id"]),
                        "name": device.get("name", "Unknown Device"),
                        "current_state": device.get("isOn", False),
                        "suggested_state": not device.get("isOn", False),
                        "confidence": 0.85
                    })
        
        return jsonify({
            "suggestions": suggestions,
            "suggested_count": len(suggestions),
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ml_routes.route('/feedback', methods=['POST'])
# Temporarily remove JWT requirement for testing
# @jwt_required()
def feedback():
    """
    Receive feedback about a prediction to improve the model
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing request body"}), 400
            
        device_id = data.get('device_id')
        accepted = data.get('accepted', False)
        
        if not device_id:
            return jsonify({"error": "Missing device_id parameter"}), 400
            
        # Log the feedback
        try:
            # Try to get the user ID from JWT
            user_id = get_jwt_identity()
        except:
            # Use a default user if JWT is unavailable
            user_id = "test_user"
            
        db.prediction_feedback_collection.insert_one({
            "device_id": ObjectId(device_id),
            "user_id": user_id,
            "accepted": accepted,
            "timestamp": datetime.utcnow()
        })
        
        return jsonify({
            "message": "Feedback received",
            "device_id": device_id,
            "accepted": accepted
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500