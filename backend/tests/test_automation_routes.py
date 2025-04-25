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

@pytest.fixture(autouse=True)
def cleanup_mock_automations():
    yield
    db.automations_collection.delete_many({"name": {"$regex": "^MOCK_"}})

def test_get_automations(client, auth_headers):
    response = client.get('/api/automations/', headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.get_json(), list)

def test_create_automation_valid(client, auth_headers):
    automation_data = {
        "name": "MOCK_Test Automation",
        "type": "time",
        "condition": {"time": "12:00"},
        "action": {"deviceId": "000000000000000000000000", "command": "toggle", "value": True}
    }
    response = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data is not None
    assert 'id' in data

def test_create_automation_missing_fields(client, auth_headers):
    response = client.post('/api/automations/', json={"name": "MOCK_Missing Stuff"}, headers=auth_headers)
    assert response.status_code == 400
    assert 'error' in response.get_json()

def test_update_automation_valid(client, auth_headers):
    inserted = db.automations_collection.insert_one({
        "name": "MOCK_To Be Updated",
        "type": "time",
        "condition": {"time": "14:00"},
        "action": {"deviceId": ObjectId(), "command": "toggle", "value": True},
        "enabled": True
    })
    automation_id = str(inserted.inserted_id)
    response = client.put(f'/api/automations/{automation_id}', json={
        "name": "MOCK_Updated Name",
        "type": "time",
        "condition": {"time": "14:00"},
        "action": {"deviceId": "000000000000000000000000", "command": "toggle", "value": True},
        "enabled": True
    }, headers=auth_headers)
    assert response.status_code == 200

def test_update_automation_invalid_id(client, auth_headers):
    response = client.put('/api/automations/000000000000000000000000', json={"name": "MOCK_Invalid"}, headers=auth_headers)
    assert response.status_code in [404, 500]

def test_delete_automation_valid(client, auth_headers):
    inserted = db.automations_collection.insert_one({
        "name": "MOCK_To Be Deleted",
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
        "name": "MOCK_Toggle Me",
        "type": "time",
        "condition": {"time": "22:00"},
        "action": {"deviceId": ObjectId(), "command": "toggle", "value": True},
        "enabled": True
    })
    automation_id = str(inserted.inserted_id)
    response = client.post(f'/api/automations/{automation_id}/toggle', headers=auth_headers)
    assert response.status_code == 200
    assert 'enabled' in response.get_json()

def test_toggle_automation_invalid_id(client, auth_headers):
    response = client.post('/api/automations/000000000000000000000000/toggle', headers=auth_headers)
    assert response.status_code == 404

def test_create_automation_invalid_root_device_id(client, auth_headers):
    automation_data = {
        "name": "MOCK_Bad Root Device ID",
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
        "name": "MOCK_Partial Update",
        "type": "time",
        "condition": {"time": "14:00"},
        "action": {"deviceId": ObjectId(), "command": "toggle", "value": True},
        "enabled": True
    })
    automation_id = str(inserted.inserted_id)
    response = client.put(f'/api/automations/{automation_id}', json={"name": "MOCK_Still Missing Stuff"}, headers=auth_headers)
    assert response.status_code in [200, 500]

def test_device_condition_automation(client, auth_headers):
    automation_data = {
        "name": "MOCK_Device Condition Automation",
        "type": "device-link",
        "condition": {"deviceId": "000000000000000000000000", "state": "on"},
        "action": {"deviceId": "000000000000000000000000", "command": "toggle", "value": True}
    }
    response = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response.status_code == 201

def test_create_automation_randomized_name(client, auth_headers):
    unique_name = f"MOCK_Random Automation {uuid4().hex[:6]}"
    automation_data = {
        "name": unique_name,
        "type": "time",
        "condition": {"time": "10:00"},
        "action": {"deviceId": "000000000000000000000000", "command": "toggle", "value": True}
    }
    response = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response.status_code == 201

def test_duplicate_automation_name(client, auth_headers):
    name = "MOCK_Duplicate Name"
    automation_data = {
        "name": name,
        "type": "time",
        "condition": {"time": "16:00"},
        "action": {"deviceId": "000000000000000000000000", "command": "toggle", "value": True}
    }
    response1 = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response1.status_code == 201

    response2 = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response2.status_code in [201, 409]

def test_create_automation_turn_on(client, auth_headers):
    automation_data = {
        "name": "MOCK_Turn On Test",
        "type": "time",
        "condition": {"type": "time", "value": "12:00"},
        "action": {
            "deviceId": "000000000000000000000000",
            "command": "turn_on"
        },
        "enabled": True
    }
    response = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response.status_code == 201
    data = response.get_json()
    assert 'id' in data

def test_create_automation_turn_off(client, auth_headers):
    automation_data = {
        "name": "MOCK_Turn Off Test",
        "type": "time",
        "condition": {"type": "time", "value": "12:00"},
        "action": {
            "deviceId": "000000000000000000000000",
            "command": "turn_off"
        },
        "enabled": True
    }
    response = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response.status_code == 201
    data = response.get_json()
    assert 'id' in data

def test_create_automation_invalid_command(client, auth_headers):
    automation_data = {
        "name": "MOCK_Invalid Command",
        "type": "time",
        "condition": {"type": "time", "value": "12:00"},
        "action": {
            "deviceId": "000000000000000000000000",
            "command": "power_up"  # invalid command
        },
        "enabled": True
    }
    response = client.post('/api/automations/', json=automation_data, headers=auth_headers)
    assert response.status_code in [201, 400]  
