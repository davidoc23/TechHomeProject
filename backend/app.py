from flask import Flask, jsonify
from flask_cors import CORS
from routes.device_routes import device_routes
from routes.room_routes import room_routes
from routes.automation_routes import automation_routes
from routes.home_assistant_routes import home_assistant_routes  # Import the new route



app = Flask(__name__)
app.url_map.strict_slashes = False
CORS(app)

@app.route('/')
def home():
    return jsonify({
        "message": "Smart Home API",
        "endpoints": {
            "devices": "/api/devices",
            "rooms": "/api/rooms",
            "automations": "/api/automations",
            "devices_by_room": "/api/devices/by-room/<room_id>",
            "toggle": "/api/devices/<id>/toggle",
            "temperature": "/api/devices/<id>/temperature",
            "toggle_all_lights": "/api/devices/toggle-all-lights"
        }
    })

app.register_blueprint(device_routes, url_prefix='/api/devices')
app.register_blueprint(room_routes, url_prefix='/api/rooms')
app.register_blueprint(automation_routes, url_prefix='/api/automations')
app.register_blueprint(home_assistant_routes, url_prefix='/api/home-assistant')  # Register the new route



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)