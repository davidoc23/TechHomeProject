import pytest
import sys
import os
from bson import ObjectId

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app
import db

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def auth_headers(client):
    client.post('/api/auth/register', json={
        'username': 'roomtester',
        'email': 'roomtester@gmail.com',
        'password': 'ValidPass123'
    })
    login = client.post('/api/auth/login', json={
        'username': 'roomtester',
        'password': 'ValidPass123'
    })
    token = login.get_json().get('access_token')
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture(autouse=True)
def cleanup_mock_rooms():
    yield
    db.devices_collection.delete_many({"name": {"$regex": "^MOCK_"}})
    db.rooms_collection.delete_many({"name": {"$regex": "^MOCK_"}})

def test_get_rooms_empty(client, auth_headers):
    response = client.get('/api/rooms/', headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.get_json(), list)

def test_add_room_valid(client, auth_headers):
    response = client.post('/api/rooms/', json={"name": "MOCK_Living Room"}, headers=auth_headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data['name'] == "MOCK_Living Room"
    assert 'id' in data

def test_add_room_missing_name(client, auth_headers):
    response = client.post('/api/rooms/', json={}, headers=auth_headers)
    assert response.status_code == 400
    assert response.get_json().get('error') == "Room name required"

def test_update_room_valid(client, auth_headers):
    inserted = db.rooms_collection.insert_one({"name": "MOCK_Old Room"})
    room_id = str(inserted.inserted_id)
    response = client.put(f'/api/rooms/{room_id}', json={"name": "MOCK_Updated Room"}, headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data['name'] == "MOCK_Updated Room"

def test_update_room_invalid_id(client, auth_headers):
    response = client.put('/api/rooms/000000000000000000000000', json={"name": "MOCK_Updated"}, headers=auth_headers)
    assert response.status_code in [404, 500]

def test_delete_room_valid(client, auth_headers):
    inserted = db.rooms_collection.insert_one({"name": "MOCK_Delete Me"})
    room_id = str(inserted.inserted_id)
    response = client.delete(f'/api/rooms/{room_id}', headers=auth_headers)
    assert response.status_code == 200

def test_delete_room_with_devices(client, auth_headers):
    room_id = db.rooms_collection.insert_one({"name": "MOCK_Has Devices"}).inserted_id
    db.devices_collection.insert_one({
        "name": "MOCK_Room Light",
        "type": "light",
        "isOn": True,
        "roomId": room_id
    })
    response = client.delete(f'/api/rooms/{room_id}', headers=auth_headers)
    assert response.status_code == 400
    assert "devices" in response.get_json().get('error')

def test_get_room_devices(client, auth_headers):
    room_id = db.rooms_collection.insert_one({"name": "MOCK_Room With Device"}).inserted_id
    db.devices_collection.insert_one({
        "name": "MOCK_Fan",
        "type": "fan",
        "isOn": False,
        "roomId": room_id
    })
    response = client.get(f'/api/rooms/{room_id}/devices', headers=auth_headers)
    assert response.status_code == 200
    devices = response.get_json()
    assert isinstance(devices, list)
    assert devices[0]['name'] == "MOCK_Fan"

def test_update_room_same_name(client, auth_headers):
    inserted = db.rooms_collection.insert_one({"name": "MOCK_Duplicate Room"})
    room_id = str(inserted.inserted_id)
    response = client.put(f'/api/rooms/{room_id}', json={"name": "MOCK_Duplicate Room"}, headers=auth_headers)
    assert response.status_code == 200

def test_delete_nonexistent_room(client, auth_headers):
    response = client.delete('/api/rooms/000000000000000000000000', headers=auth_headers)
    assert response.status_code == 404

def test_invalid_objectid_format(client, auth_headers):
    response = client.get('/api/rooms/invalid123/devices', headers=auth_headers)
    assert response.status_code == 500
