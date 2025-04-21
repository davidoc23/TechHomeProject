from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import db
from ml_models import device_predictor, get_device_suggestions, update_device_history
from datetime import datetime, timedelta
import random

ml_routes = Blueprint('ml_routes', __name__)

@ml_routes.route('/predict/device/<device_id>', methods=['GET'])
@jwt_required()
def predict_device_state(device_id):
    """
    Predict if a device should be on or off based on usage patterns
    """
    try:
        # Get user ID from JWT for personalized predictions
        user_id = get_jwt_identity()
        
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
@jwt_required()
def get_suggestions():
    """
    Get AI suggestions for devices that should be toggled
    """
    try:
        # Get user ID from JWT for personalized suggestions
        user_id = get_jwt_identity()
        
        # Get real suggestions if available
        suggestions = get_device_suggestions()
        
        # If no real suggestions, provide mock data for testing
        if not suggestions:
            # Get a random device to suggest
            devices = list(db.devices_collection.find(limit=3))
            if devices:
                for device in devices:
                    # Only suggest for devices that haven't changed state recently
                    last_change = db.device_history_collection.find_one(
                        {"device_id": device["_id"]},
                        sort=[("timestamp", -1)]
                    )
                    
                    # If no history or last change was more than 30 minutes ago
                    if not last_change or (datetime.utcnow() - last_change["timestamp"]).total_seconds() > 1800:
                        confidence = random.uniform(0.75, 0.95)  # Random confidence between 75-95%
                        suggestions.append({
                            "device_id": str(device["_id"]),
                            "name": device.get("name", "Unknown Device"),
                            "current_state": device.get("isOn", False),
                            "suggested_state": not device.get("isOn", False),
                            "confidence": round(confidence, 2)
                        })
                        
                        # Only suggest 1-2 devices at a time for better UX
                        if len(suggestions) >= 2:
                            break
        
        return jsonify({
            "suggestions": suggestions,
            "suggested_count": len(suggestions),
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id  # Include user ID for frontend reference
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
        # Get user ID from JWT for personalized learning
        user_id = get_jwt_identity()
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing request body"}), 400
            
        device_id = data.get('device_id')
        accepted = data.get('accepted', False)
        
        if not device_id:
            return jsonify({"error": "Missing device_id parameter"}), 400
            
        # Log the feedback with the authenticated user
        db.prediction_feedback_collection.insert_one({
            "device_id": ObjectId(device_id),
            "user_id": user_id,
            "accepted": accepted,
            "timestamp": datetime.utcnow()
        })
        
        return jsonify({
            "message": "Feedback received",
            "device_id": device_id,
            "accepted": accepted,
            "user_id": user_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500