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
        # Get suggestions from ML model
        suggestions = get_device_suggestions()
        
        return jsonify({
            "suggestions": suggestions,
            "suggested_count": len(suggestions),
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500