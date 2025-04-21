import pytest
import sys
import os
import json

# Add backend path to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_register_valid_user(client):
    response = client.post('/api/auth/register', json={
        'username': 'testuser1',
        'email': 'testuser1@gmail.com',
        'password': 'ValidPass123'
    })
    print("Register response:", response.get_json())
    data = response.get_json()
    
    if response.status_code in [200, 201]:
        assert 'access_token' in data
    elif response.status_code == 409:
        assert data.get('error') == 'Username already exists'
    else:
        pytest.fail(f"Unexpected status code: {response.status_code}")


def test_register_existing_user(client):
    client.post('/api/auth/register', json={
        'username': 'duplicateuser',
        'email': 'duplicate@gmail.com',
        'password': 'ValidPass123'
    })
    response = client.post('/api/auth/register', json={
        'username': 'duplicateuser',
        'email': 'duplicate@gmail.com',
        'password': 'ValidPass123'
    })
    assert response.status_code in [400, 409]

def test_register_invalid_data(client):
    response = client.post('/api/auth/register', json={
        'username': 'x',
        'email': 'invalid-email',
        'password': '123'
    })
    print("Invalid register response:", response.get_json())
    assert response.status_code == 400

def test_login_valid_credentials(client):
    client.post('/api/auth/register', json={
        'username': 'loginuser',
        'email': 'loginuser@gmail.com',
        'password': 'ValidPass123'
    })
    response = client.post('/api/auth/login', json={
        'username': 'loginuser',
        'password': 'ValidPass123'
    })
    print("Login response:", response.get_json())
    data = response.get_json()
    assert response.status_code == 200
    assert data and 'access_token' in data

def test_login_invalid_credentials(client):
    response = client.post('/api/auth/login', json={
        'username': 'nonexistent',
        'password': 'wrongpass'
    })
    assert response.status_code == 401

def test_refresh_token_valid(client):
    client.post('/api/auth/register', json={
        'username': 'refreshuser',
        'email': 'refresh@gmail.com',
        'password': 'ValidPass123'
    })
    login_response = client.post('/api/auth/login', json={
        'username': 'refreshuser',
        'password': 'ValidPass123'
    })
    refresh_token = login_response.get_json().get('refresh_token')
    print("Refresh token:", refresh_token)
    assert refresh_token is not None
    response = client.post('/api/auth/refresh', headers={
        'Authorization': f'Bearer {refresh_token}'
    })
    assert response.status_code == 200
    assert 'access_token' in response.get_json()

def test_refresh_token_invalid(client):
    response = client.post('/api/auth/refresh', headers={
        'Authorization': 'Bearer invalidtoken123'
    })
    assert response.status_code in [401, 422]

def test_logout(client):
    client.post('/api/auth/register', json={
        'username': 'logoutuser',
        'email': 'logout@gmail.com',
        'password': 'ValidPass123'
    })
    login_response = client.post('/api/auth/login', json={
        'username': 'logoutuser',
        'password': 'ValidPass123'
    })
    token = login_response.get_json().get('access_token')
    print("Access token (logout):", token)
    assert token is not None
    response = client.post('/api/auth/logout',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    json={}  # send empty JSON body
)

    assert response.status_code == 200

def test_logout_all(client):
    client.post('/api/auth/register', json={
        'username': 'logoutalluser',
        'email': 'logoutall@gmail.com',
        'password': 'ValidPass123'
    })
    login_response = client.post('/api/auth/login', json={
        'username': 'logoutalluser',
        'password': 'ValidPass123'
    })
    token = login_response.get_json().get('access_token')
    print("Access token (logout all):", token)
    assert token is not None
    response = client.post('/api/auth/logout-all', headers={
        'Authorization': f'Bearer {token}'
    })
    assert response.status_code == 200

def test_get_me(client):
    client.post('/api/auth/register', json={
        'username': 'meuser',
        'email': 'me@gmail.com',
        'password': 'ValidPass123'
    })
    login_response = client.post('/api/auth/login', json={
        'username': 'meuser',
        'password': 'ValidPass123'
    })
    token = login_response.get_json().get('access_token')
    print("Access token (me):", token)
    assert token is not None
    response = client.get('/api/auth/me', headers={
        'Authorization': f'Bearer {token}'
    })
    assert response.status_code == 200
    assert 'username' in response.get_json()

def test_patch_me(client):
    client.post('/api/auth/register', json={
        'username': 'patchuser',
        'email': 'patch@gmail.com',
        'password': 'ValidPass123'
    })
    login_response = client.post('/api/auth/login', json={
        'username': 'patchuser',
        'password': 'ValidPass123'
    })
    token = login_response.get_json().get('access_token')
    print("Access token (patch):", token)
    assert token is not None
    response = client.patch('/api/auth/me', headers={
        'Authorization': f'Bearer {token}'
    }, json={
        'email': 'patched@gmail.com'
    })
    assert response.status_code == 200

def test_initialize_admin(client):
    response = client.post('/api/auth/initialize-admin', json={
        'username': 'admin',
        'email': 'admin@gmail.com',
        'password': 'AdminPass123'
    })
    print("Initialize admin status:", response.status_code)
    assert response.status_code in [200, 201, 403]
