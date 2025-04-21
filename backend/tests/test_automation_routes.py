import pytest
import sys
import os
from bson import ObjectId
from uuid import uuid4

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
        'username': 'autotester',
        'email': 'autotester@gmail.com',
        'password': 'ValidPass123'
    })
    login = client.post('/api/auth/login', json={
        'username': 'autotester',
        'password': 'ValidPass123'
    })
    token = login.get_json().get('access_token')
    return {'Authorization': f'Bearer {token}'}

def test_get_automations(client, auth_headers):
    db.automations_collection.delete_many({})  # Clean slate
    response = client.get('/api/automations/', headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.get_json(), list)

def test_create_automation_valid(client, auth_headers):
    automation_data = {
        "name": "Test Automation",
        "type": "time",
        "condition": {"time": "12:00"},
        "action": {"deviceId": "000000000000000000000000", "command": "toggle", "value": True}
    }
    response = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data is not None
    assert 'id' in data
    automation_id = data['id']
    db.automations_collection.delete_one({"_id": ObjectId(automation_id)})

def test_create_automation_missing_fields(client, auth_headers):
    response = client.post('/api/automations/', json={"name": "Missing Stuff"}, headers=auth_headers)
    assert response.status_code == 400
    assert 'error' in response.get_json()

def test_update_automation_valid(client, auth_headers):
    inserted = db.automations_collection.insert_one({
        "name": "To Be Updated",
        "type": "time",
        "condition": {"time": "14:00"},
        "action": {"deviceId": ObjectId(), "command": "toggle", "value": True},
        "enabled": True
    })
    automation_id = str(inserted.inserted_id)
    response = client.put(f'/api/automations/{automation_id}', json={
        "name": "Updated Name",
        "type": "time",
        "condition": {"time": "14:00"},
        "action": {"deviceId": "000000000000000000000000", "command": "toggle", "value": True},
        "enabled": True
    }, headers=auth_headers)
    assert response.status_code == 200
    db.automations_collection.delete_one({"_id": ObjectId(automation_id)})

def test_update_automation_invalid_id(client, auth_headers):
    response = client.put('/api/automations/000000000000000000000000', json={"name": "Invalid"}, headers=auth_headers)
    assert response.status_code in [404, 500]

def test_delete_automation_valid(client, auth_headers):
    inserted = db.automations_collection.insert_one({
        "name": "To Be Deleted",
        "type": "time",
        "condition": {"time": "18:00"},
        "action": {"deviceId": ObjectId(), "command": "toggle", "value": True},
        "enabled": True
    })
    automation_id = str(inserted.inserted_id)
    response = client.delete(f'/api/automations/{automation_id}', headers=auth_headers)
    assert response.status_code == 200

def test_delete_automation_invalid_id(client, auth_headers):
    response = client.delete('/api/automations/000000000000000000000000', headers=auth_headers)
    assert response.status_code == 404

def test_toggle_automation(client, auth_headers):
    inserted = db.automations_collection.insert_one({
        "name": "Toggle Me",
        "type": "time",
        "condition": {"time": "22:00"},
        "action": {"deviceId": ObjectId(), "command": "toggle", "value": True},
        "enabled": True
    })
    automation_id = str(inserted.inserted_id)
    response = client.post(f'/api/automations/{automation_id}/toggle', headers=auth_headers)
    assert response.status_code == 200
    assert 'enabled' in response.get_json()
    db.automations_collection.delete_one({"_id": ObjectId(automation_id)})

def test_toggle_automation_invalid_id(client, auth_headers):
    response = client.post('/api/automations/000000000000000000000000/toggle', headers=auth_headers)
    assert response.status_code == 404

def test_create_automation_invalid_root_device_id(client, auth_headers):
    automation_data = {
        "name": "Bad Root Device ID",
        "type": "time",
        "condition": {"time": "15:00"},
        "action": {"deviceId": "000000000000000000000000", "command": "toggle", "value": True},
        "deviceId": "not-a-real-id"
    }
    response = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response.status_code == 400
    assert 'deviceId' in response.get_json().get('error', '')

def test_update_automation_missing_fields(client, auth_headers):
    inserted = db.automations_collection.insert_one({
        "name": "Partial Update",
        "type": "time",
        "condition": {"time": "14:00"},
        "action": {"deviceId": ObjectId(), "command": "toggle", "value": True},
        "enabled": True
    })
    automation_id = str(inserted.inserted_id)
    response = client.put(f'/api/automations/{automation_id}', json={"name": "Still Missing Stuff"}, headers=auth_headers)
    assert response.status_code in [200, 500]
    db.automations_collection.delete_one({"_id": ObjectId(automation_id)})

def test_device_condition_automation(client, auth_headers):
    automation_data = {
        "name": "Device Condition Automation",
        "type": "device-link",
        "condition": {"deviceId": "000000000000000000000000", "state": "on"},
        "action": {"deviceId": "000000000000000000000000", "command": "toggle", "value": True}
    }
    response = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response.status_code == 201
    automation_id = response.get_json()['id']
    db.automations_collection.delete_one({"_id": ObjectId(automation_id)})

def test_create_automation_randomized_name(client, auth_headers):
    unique_name = f"Random Automation {uuid4().hex[:6]}"
    automation_data = {
        "name": unique_name,
        "type": "time",
        "condition": {"time": "10:00"},
        "action": {"deviceId": "000000000000000000000000", "command": "toggle", "value": True}
    }
    response = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response.status_code == 201
    automation_id = response.get_json()['id']
    db.automations_collection.delete_one({"_id": ObjectId(automation_id)})

def test_duplicate_automation_name(client, auth_headers):
    name = "Duplicate Name"
    automation_data = {
        "name": name,
        "type": "time",
        "condition": {"time": "16:00"},
        "action": {"deviceId": "000000000000000000000000", "command": "toggle", "value": True}
    }
    response1 = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response1.status_code == 201
    automation_id1 = response1.get_json()['id']

    response2 = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response2.status_code in [201, 409]

    db.automations_collection.delete_one({"_id": ObjectId(automation_id1)})
    if response2.status_code == 201:
        automation_id2 = response2.get_json()['id']
        db.automations_collection.delete_one({"_id": ObjectId(automation_id2)})
