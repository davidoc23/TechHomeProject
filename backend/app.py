from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from datetime import datetime, timezone
from config import JWT_SECRET_KEY
from routes.device_routes import device_routes
from routes.room_routes import room_routes
from routes.automation_routes import automation_routes
from routes.home_assistant_routes import home_assistant_routes
from routes.auth_routes import auth_routes
from routes.ml_routes import ml_routes
import db
from scheduler import start_scheduler, schedule_automations
from routes.analytics_routes import analytics_routes

app = Flask(__name__)
app.url_map.strict_slashes = False
CORS(app)

# Configure JWT
app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 3600  # 1 hour
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = 2592000  # 30 days

jwt = JWTManager(app)

# JWT expiry callback
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    if 'jti' not in jwt_payload:
        return False
    
    # We only check refresh tokens against the blocklist
    if jwt_payload.get('type') != 'refresh':
        return False
    
    jti = jwt_payload['jti']
    token = db.find_refresh_token(jti)
    
    # If token not in database or is revoked, consider it blocked
    return token is None or token.get('is_revoked', False)

@app.route('/')
def home():
    return jsonify({
        "message": "TechHome Smart Home API",
        "endpoints": {
            "auth": {
                "register": "/api/auth/register",
                "login": "/api/auth/login",
                "refresh": "/api/auth/refresh",
                "logout": "/api/auth/logout",
                "me": "/api/auth/me"
            },
            "devices": {
                "list": "/api/devices",
                "toggle": "/api/devices/<id>/toggle",
                "temperature": "/api/devices/<id>/temperature",
                "toggle_all_lights": "/api/devices/toggle-all-lights"
            },
            "rooms": {
                "list": "/api/rooms",
                "devices_by_room": "/api/devices/by-room/<room_id>"
            },
            "automations": "/api/automations",
            "home_assistant": "/api/home-assistant",
            "ml": {
                "predict_device": "/api/ml/predict/device/<device_id>",
                "suggestions": "/api/ml/suggestions",
                "feedback": "/api/ml/feedback"
            }
        }
    })

# Test endpoint to verify authentication
@app.route('/api/test-auth')
#@jwt_required()
def test_auth():
    user_id = get_jwt_identity()
    return jsonify({
        "message": "Authentication successful",
        "user_id": user_id
    })

# Debug endpoints without authentication for testing purposes
@app.route('/api/debug/devices')
def debug_devices():
    try:
        devices = list(db.devices_collection.find())
        formatted_devices = []
        for device in devices:
            formatted_device = {
                'id': str(device['_id']),
                'name': device['name'],
                'type': device['type'],
                'isOn': device['isOn']
            }
            
            if 'roomId' in device:
                formatted_device['roomId'] = str(device['roomId'])
            if 'temperature' in device:
                formatted_device['temperature'] = device['temperature']
            if 'isHomeAssistant' in device:
                formatted_device['isHomeAssistant'] = device['isHomeAssistant']
            if 'entityId' in device:
                formatted_device['entityId'] = device['entityId']
            formatted_devices.append(formatted_device)
            
        return jsonify(formatted_devices)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Debug endpoint to toggle a device without authentication
@app.route('/api/debug/devices/<device_id>/toggle', methods=['POST'])
def debug_toggle_device(device_id):
    try:
        from bson import ObjectId
        import requests
        from config import HOME_ASSISTANT_URL, HOME_ASSISTANT_TOKEN
        
        # Find device in database
        device = db.devices_collection.find_one({"_id": ObjectId(device_id)})
        if not device:
            return jsonify({"error": "Device not found"}), 404

        # Determine new state
        new_state = not device.get('isOn', False)  # Toggle the state

        # Handle Home Assistant devices
        if device.get('isHomeAssistant'):
            print(f"📱 Device {device['name']} is a Home Assistant device with entity_id: {device.get('entityId')}")
            
            # Toggle Home Assistant Device
            ha_payload = {"entity_id": device["entityId"]}
            ha_headers = {
                "Authorization": f"Bearer {HOME_ASSISTANT_TOKEN}",
                "Content-Type": "application/json"
            }
            ha_service = "turn_on" if new_state else "turn_off"
            ha_url = f"{HOME_ASSISTANT_URL}/api/services/light/{ha_service}"
            
            print(f"📡 Sending command to Home Assistant: {ha_service} for {device['entityId']}")
            
            ha_response = requests.post(ha_url, json=ha_payload, headers=ha_headers)
            
            if ha_response.status_code == 401:
                print(f"❌ ERROR: Unauthorized Home Assistant token for {device['entityId']}")
                return jsonify({"error": "Unauthorized - Invalid Home Assistant token"}), 401
                
            if ha_response.status_code != 200:
                print(f"⚠️ WARNING: Failed to toggle {device['entityId']}. Response: {ha_response.text}")
                return jsonify({"error": f"Failed to toggle Home Assistant device: {ha_response.text}"}), ha_response.status_code
                
            # Fetch updated state from Home Assistant
            # Function imported from device_routes
            from routes.device_routes import get_homeassistant_state
            new_state = get_homeassistant_state(device["entityId"])
            print(f"🔄 Updated state from Home Assistant: {new_state}")
        else:
            print(f"🔹 Toggling local device {device['name']} to {'ON' if new_state else 'OFF'}")

        # Update MongoDB state
        db.devices_collection.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": {"isOn": new_state}}
        )

        # Return full updated device object for frontend
        updated_device = {
            "id": str(device["_id"]),
            "name": device["name"],
            "type": device["type"],
            "roomId": str(device["roomId"]) if "roomId" in device else None,
            "isOn": new_state,
            "isHomeAssistant": device.get("isHomeAssistant", False),
            "entityId": device.get("entityId", None)
        }

        return jsonify(updated_device), 200
    except Exception as e:
        print(f"❌ Error in debug toggle: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Debug endpoint to toggle all lights without authentication
@app.route('/api/debug/devices/toggle-all-lights', methods=['POST'])
def debug_toggle_all_lights():
    try:
        from bson import ObjectId
        import requests
        from config import HOME_ASSISTANT_URL, HOME_ASSISTANT_TOKEN
        
        data = request.get_json()
        if 'desiredState' not in data:
            return jsonify({"error": "Desired state required"}), 400

        desired_state = data['desiredState']  # True = ON, False = OFF
        print(f"🔄 Toggling all lights to {desired_state}")

        # Fetch all light devices
        lights = list(db.devices_collection.find({"type": "light"}))
        updated_lights = []

        for device in lights:
            if device.get('isHomeAssistant'):
                # Handle Home Assistant Device
                print(f"📱 HA Light: {device['name']} with entity_id: {device.get('entityId')}")
                
                ha_payload = {"entity_id": device["entityId"]}
                ha_headers = {
                    "Authorization": f"Bearer {HOME_ASSISTANT_TOKEN}",
                    "Content-Type": "application/json"
                }
                ha_service = "turn_on" if desired_state else "turn_off"
                ha_url = f"{HOME_ASSISTANT_URL}/api/services/light/{ha_service}"
                
                print(f"📡 Sending command to HA: {ha_service} for {device['entityId']}")
                
                ha_response = requests.post(ha_url, json=ha_payload, headers=ha_headers)
                
                if ha_response.status_code == 401:
                    print(f"❌ ERROR: Unauthorized HA token for {device['entityId']}")
                    continue
                    
                if ha_response.status_code != 200:
                    print(f"⚠️ WARNING: Failed to toggle {device['entityId']}. Response: {ha_response.text}")
                    continue
                    
                # We still update local DB even if HA operation fails
            else:
                print(f"🔹 Toggling local light {device['name']} to {'ON' if desired_state else 'OFF'}")

            # Update MongoDB state
            db.devices_collection.update_one(
                {"_id": ObjectId(device["_id"])},
                {"$set": {"isOn": desired_state}}
            )

            # Append updated device state
            updated_lights.append({
                "id": str(device["_id"]),
                "name": device["name"],
                "type": device["type"],
                "isOn": desired_state,
                "isHomeAssistant": device.get("isHomeAssistant", False)
            })

        return jsonify(updated_lights), 200
    except Exception as e:
        print(f"❌ Error in debug toggle all lights: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Debug endpoint to set thermostat temperature without authentication
@app.route('/api/debug/devices/<device_id>/temperature', methods=['POST'])
def debug_set_temperature(device_id):
    try:
        from bson import ObjectId
        import requests
        from config import HOME_ASSISTANT_URL, HOME_ASSISTANT_TOKEN
        
        data = request.get_json()
        if not data or 'temperature' not in data:
            return jsonify({"error": "Temperature required"}), 400
        
        new_temp = data['temperature']
        print(f"🌡️ Setting temperature to {new_temp}°F for device {device_id}")

        device = db.devices_collection.find_one({"_id": ObjectId(device_id)})
        if not device:
            return jsonify({"error": "Device not found"}), 404
        if device['type'] != 'thermostat':
            return jsonify({"error": "Not a thermostat"}), 400

        # Handle Home Assistant thermostat if applicable
        if device.get('isHomeAssistant'):
            print(f"📱 HA Thermostat: {device['name']} with entity_id: {device.get('entityId')}")
            
            ha_payload = {
                "entity_id": device["entityId"], 
                "temperature": float(new_temp)
            }
            ha_headers = {
                "Authorization": f"Bearer {HOME_ASSISTANT_TOKEN}",
                "Content-Type": "application/json"
            }
            
            ha_url = f"{HOME_ASSISTANT_URL}/api/services/climate/set_temperature"
            print(f"📡 Sending temperature command to Home Assistant for {device['entityId']}")
            
            ha_response = requests.post(ha_url, json=ha_payload, headers=ha_headers)
            
            if ha_response.status_code != 200:
                print(f"⚠️ WARNING: Failed to set temperature for {device['entityId']}. Response: {ha_response.text}")
                # Continue anyway to update local database
        else:
            print(f"🔹 Setting temperature for local thermostat {device['name']} to {new_temp}°F")

        # Update MongoDB state
        db.devices_collection.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": {"temperature": new_temp}}
        )
        
        # Prepare response
        updated_device = {
            "id": str(device["_id"]),
            "name": device["name"],
            "type": device["type"],
            "roomId": str(device["roomId"]) if "roomId" in device else None,
            "isOn": device.get("isOn", False),
            "temperature": new_temp,
            "isHomeAssistant": device.get("isHomeAssistant", False),
            "entityId": device.get("entityId", None)
        }
        
        return jsonify(updated_device)
    except Exception as e:
        print(f"❌ Error in debug set temperature: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug/rooms')
def debug_rooms():
    try:
        rooms = list(db.rooms_collection.find())
        for room in rooms:
            room['id'] = str(room['_id'])
            del room['_id']
        return jsonify(rooms)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug/automations')
def debug_automations():
    try:
        automations = list(db.automations_collection.find())
        for automation in automations:
            automation['id'] = str(automation['_id'])
            if 'deviceId' in automation:
                automation['deviceId'] = str(automation['deviceId'])
            del automation['_id']
        return jsonify(automations)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Register routes
app.register_blueprint(auth_routes, url_prefix='/api/auth')
app.register_blueprint(device_routes, url_prefix='/api/devices')
app.register_blueprint(room_routes, url_prefix='/api/rooms')
app.register_blueprint(automation_routes, url_prefix='/api/automations')
app.register_blueprint(home_assistant_routes, url_prefix='/api/home-assistant')
app.register_blueprint(ml_routes, url_prefix='/api/ml')
app.register_blueprint(analytics_routes, url_prefix='/api/analytics')


# Refresh scheduled automations after any request
@app.after_request
def refresh_scheduler(response):
    try:
        schedule_automations()
    except Exception as e:
        print(f"Error refreshing scheduler: {e}")
    return response

# Initialize admin user if needed
#@app.before_first_request
def initialize_admin():
    if db.users_collection.count_documents({}) == 0:
        from config import ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
        from passlib.hash import bcrypt
        
        # Create admin user
        password_hash = bcrypt.hash(ADMIN_PASSWORD)
        
        try:
            db.create_user(
                username=ADMIN_USERNAME,
                email=ADMIN_EMAIL,
                password_hash=password_hash,
                role="admin"
            )
            print("Admin user initialized successfully")
        except Exception as e:
            print(f"Admin initialization failed: {str(e)}")

if __name__ == '__main__':
    start_scheduler()
    schedule_automations()
    app.run(host='0.0.0.0', port=5000, debug=True)