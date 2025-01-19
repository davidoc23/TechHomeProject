from flask import Flask, jsonify
from flask_cors import CORS
from routes.device_routes import device_routes

app = Flask(__name__)
app.url_map.strict_slashes = False
CORS(app)

@app.route('/')
def home():
    return jsonify({
        "message": "Smart Home API",
        "endpoints": {
            "devices": "/api/devices",
            "toggle": "/api/devices/<id>/toggle",
            "temperature": "/api/devices/<id>/temperature"
        }
    })

app.register_blueprint(device_routes, url_prefix='/api/devices')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
