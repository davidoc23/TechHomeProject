import pytest
import sys
import os
from unittest.mock import patch
from bson import ObjectId
from requests.exceptions import Timeout

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
        'username': 'hatester',
        'email': 'hatester@gmail.com',
        'password': 'ValidPass123'
    })
    login = client.post('/api/auth/login', json={
        'username': 'hatester',
        'password': 'ValidPass123'
    })
    token = login.get_json().get('access_token')
    return {'Authorization': f'Bearer {token}'}

@patch('requests.post')
@patch('requests.get')
def test_toggle_ha_valid_with_db_device(mock_get, mock_post, client, auth_headers):
    entity_id = "light.test_light"

    # Insert mock HA device into DB
    device_id = db.devices_collection.insert_one({
        "name": "Test Light",
        "type": "light",
        "entityId": entity_id,
        "isHomeAssistant": True,
        "isOn": False
    }).inserted_id

    mock_post.return_value.status_code = 200

    response = client.post(f'/api/home-assistant/toggle/{entity_id}', headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data.get("success") is True
    assert data.get("entity_id") == entity_id

    db.devices_collection.delete_one({"_id": device_id})

@patch('requests.post')
@patch('requests.get')
def test_toggle_ha_valid_without_db_device(mock_get, mock_post, client, auth_headers):
    entity_id = "light.test_fallback"

    # Simulate response from HA with current state "off"
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"state": "off"}
    mock_post.return_value.status_code = 200

    response = client.post(f'/api/home-assistant/toggle/{entity_id}', headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data.get("entity_id") == entity_id
    assert data.get("success") is True

@patch('requests.post')
@patch('requests.get')
def test_toggle_ha_auth_failure(mock_get, mock_post, client, auth_headers):
    entity_id = "light.auth_fail"

    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"state": "on"}
    mock_post.return_value.status_code = 401

    response = client.post(f'/api/home-assistant/toggle/{entity_id}', headers=auth_headers)
    assert response.status_code == 401

@patch('requests.post')
@patch('requests.get')
def test_toggle_ha_entity_not_found(mock_get, mock_post, client, auth_headers):
    entity_id = "light.does_not_exist"

    mock_get.return_value.status_code = 404
    mock_post.return_value.status_code = 200 

    response = client.post(f'/api/home-assistant/toggle/{entity_id}', headers=auth_headers)
    assert response.status_code == 404

@patch('requests.post')
@patch('requests.get')
def test_toggle_ha_timeout(mock_get, mock_post, client, auth_headers):
    entity_id = "light.timeout"
    mock_get.side_effect = Timeout("Connection timed out")
    response = client.post(f'/api/home-assistant/toggle/{entity_id}', headers=auth_headers)
    assert response.status_code == 500
    assert "error" in response.get_json()

def test_toggle_ha_invalid_entity_id(client, auth_headers):
    invalid_entity_ids = ["", None]
    for entity_id in invalid_entity_ids:
        url = f'/api/home-assistant/toggle/{entity_id or "null"}'
        response = client.post(url, headers=auth_headers)
        assert response.status_code in [404, 500]

@patch('requests.post')
@patch('requests.get')
@patch('db.devices_collection.update_one')
def test_toggle_ha_db_update_failure(mock_update, mock_get, mock_post, client, auth_headers):
    entity_id = "light.db_error"

    # Insert the device into DB to trigger update block
    device_id = db.devices_collection.insert_one({
        "name": "DB Error Light",
        "type": "light",
        "entityId": entity_id,
        "isHomeAssistant": True,
        "isOn": True
    }).inserted_id

    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"state": "on"}
    mock_post.return_value.status_code = 200

    # Simulate DB failure
    mock_update.side_effect = Exception("Simulated DB failure")

    response = client.post(f'/api/home-assistant/toggle/{entity_id}', headers=auth_headers)
    assert response.status_code == 500
    assert "error" in response.get_json()

    db.devices_collection.delete_one({"_id": device_id})

@patch('requests.post')
@patch('requests.get')
def test_toggle_ha_flips_device_state(mock_get, mock_post, client, auth_headers):
    entity_id = "light.flip_test"

    # Insert device with isOn=True
    device_id = db.devices_collection.insert_one({
        "name": "Flip Test Light",
        "type": "light",
        "entityId": entity_id,
        "isHomeAssistant": True,
        "isOn": True
    }).inserted_id

    mock_post.return_value.status_code = 200

    response = client.post(f'/api/home-assistant/toggle/{entity_id}', headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data.get("success") is True
    assert data.get("new_state") == "off"

    db.devices_collection.delete_one({"_id": device_id})
