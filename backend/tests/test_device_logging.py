import pytest
import sys
import os

from datetime import datetime
from bson import ObjectId
from datetime import datetime, timezone
datetime.now(timezone.utc)

# Add backend path to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_toggle_device_logs_action(client):
    """
    Test that toggling a device logs the action in the device_logs collection with the correct user and result.
    Cleans up the test user, device, room, and logs afterwards.
    """

    # --- SETUP: Register and log in a test user to get JWT ---
    username = "testuser_log"
    client.post('/api/auth/register', json={
        'username': username,
        'email': 'testuser_log@gmail.com',
        'password': 'ValidPass123'
    })
    login_resp = client.post('/api/auth/login', json={
        'username': username,
        'password': 'ValidPass123'
    })
    token = login_resp.get_json().get('access_token')
    assert token is not None

    # --- SETUP: Add a room via API to get a real roomId ---
    room_resp = client.post('/api/rooms', json={'name': 'Test Room'}, headers={'Authorization': f'Bearer {token}'})
    assert room_resp.status_code == 201
    room_id = room_resp.get_json()['id']

    # --- SETUP: Add a device via API with real roomId ---
    device_resp = client.post('/api/devices', json={
        'name': 'Test Light',
        'type': 'light',
        'roomId': room_id,
        'isHomeAssistant': False,
        'attributes': {}
    }, headers={'Authorization': f'Bearer {token}'})
    assert device_resp.status_code == 201
    device_id = device_resp.get_json()["id"]

    # --- ACT: Toggle the device to trigger logging ---
    toggle_resp = client.post(
        f"/api/devices/{device_id}/toggle",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert toggle_resp.status_code == 200

    # --- ASSERT: Check the log in device_logs (direct db access for test) ---
    from db import device_logs, users_collection, devices_collection, rooms_collection
    log = device_logs.find_one({"device": device_id, "action": "toggle"})
    assert log is not None, "No log entry found for device toggle"
    assert log["user"] == username, "Log does not contain correct username"
    assert log["result"] in ["on", "off"], "Log result is not on/off"

    # --- CLEANUP: Remove test user, device, room, and log(s) from the database ---
    users_collection.delete_one({"username": username})
    devices_collection.delete_one({"_id": ObjectId(device_id)})
    rooms_collection.delete_one({"_id": ObjectId(room_id)})
    device_logs.delete_many({"device": device_id})
