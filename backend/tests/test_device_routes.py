import pytest
import sys
import os
from bson import ObjectId
from unittest.mock import patch
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

# Add backend path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app
import db

def ensure_dummy_thermostat():
    thermostat_id = ObjectId("111111111111111111111111")
    if not db.devices_collection.find_one({"_id": thermostat_id}):
        db.devices_collection.insert_one({
            "_id": thermostat_id,
            "name": "MOCK_Dummy Thermostat",
            "type": "thermostat",
            "isOn": False
        })

@pytest.fixture(autouse=True)
def cleanup_mock_devices():
    yield
    db.devices_collection.delete_many({"name": {"$regex": "^MOCK_"}})

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def auth_headers(client):
    """Create a test user and return authorization headers"""
    client.post('/api/auth/register', json={
        'username': 'devicetester',
        'email': 'devicetester@gmail.com',
        'password': 'ValidPass123'
    })
    login = client.post('/api/auth/login', json={
        'username': 'devicetester',
        'password': 'ValidPass123'
    })
    token = login.get_json().get('access_token')
    return {'Authorization': f'Bearer {token}'}

def test_get_devices(client):
    response = client.get('/api/devices')
    assert response.status_code == 200
    assert isinstance(response.get_json(), list)

def test_toggle_device_invalid_id(client, auth_headers):
    invalid_id = "ffffffffffffffffffffffff"
    response = client.post(f'/api/devices/{invalid_id}/toggle', headers=auth_headers)
    assert response.status_code == 404

def test_toggle_all_lights_missing_data(client, auth_headers):
    response = client.post('/api/devices/toggle-all-lights', json={}, headers=auth_headers)
    assert response.status_code == 400
    data = response.get_json()
    assert data.get('error') == 'Desired state required'

def test_toggle_all_lights_valid(client, auth_headers):
    response = client.post('/api/devices/toggle-all-lights', json={
        'desiredState': True
    }, headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.get_json(), list)

def test_set_temperature_missing_value(client, auth_headers):
    ensure_dummy_thermostat()
    dummy_id = "111111111111111111111111"
    response = client.post(f'/api/devices/{dummy_id}/temperature', json={}, headers=auth_headers)
    assert response.status_code == 400
    assert response.get_json().get('error') == 'Temperature required'

@patch('requests.post')
def test_toggle_homeassistant_device(mock_post, client, auth_headers):
    device_id = ObjectId()
    db.devices_collection.insert_one({
        "_id": device_id,
        "name": "MOCK_HA Light",
        "type": "light",
        "isHomeAssistant": True,
        "entityId": "light.mock_ha_light",
        "roomId": None,
        "isOn": False
    })

    mock_post.return_value.status_code = 200
    mock_post.return_value.text = '{"result": "success"}'

    response = client.post(f'/api/devices/{device_id}/toggle', headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data['name'] == 'MOCK_HA Light'
    assert 'isOn' in data

@patch('requests.post')
def test_toggle_homeassistant_device_failure(mock_post, client, auth_headers):
    device_id = ObjectId()
    db.devices_collection.insert_one({
        "_id": device_id,
        "name": "MOCK_Broken HA Light",
        "type": "light",
        "isHomeAssistant": True,
        "entityId": "light.broken_ha_light",
        "roomId": None,
        "isOn": False
    })

    mock_post.return_value.status_code = 500
    mock_post.return_value.text = 'Internal Server Error'

    response = client.post(f'/api/devices/{device_id}/toggle', headers=auth_headers)
    assert response.status_code != 200
    assert 'error' in response.get_json()

def test_toggle_real_local_device(client, auth_headers):
    device_id = ObjectId()
    db.devices_collection.insert_one({
        "_id": device_id,
        "name": "MOCK_Test Lamp",
        "type": "light",
        "isHomeAssistant": False,
        "isOn": False
    })

    response = client.post(f'/api/devices/{device_id}/toggle', headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data['name'] == "MOCK_Test Lamp"
    assert 'isOn' in data

@pytest.mark.integration
def test_real_ha_device_toggle():
    ha_url = os.getenv("HOME_ASSISTANT_URL")
    ha_token = os.getenv("HOME_ASSISTANT_TOKEN")
    entity_id = "light.wifi_led"

    assert ha_url and ha_token and entity_id, "Missing HA configuration in .env"

    response = requests.post(
        f"{ha_url}/api/services/light/toggle",
        headers={
            "Authorization": f"Bearer {ha_token}",
            "Content-Type": "application/json"
        },
        json={"entity_id": entity_id}
    )

    print("HA Response:", response.text)
    assert response.status_code == 200
