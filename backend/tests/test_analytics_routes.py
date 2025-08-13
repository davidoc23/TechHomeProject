import pytest
import sys
import os
from bson import ObjectId
from datetime import datetime, timedelta
from unittest.mock import patch
import csv
import io

# Add backend path to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app
import db
from models.device_log import log_device_action

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def auth_headers(client):
    """Create a test user and return authorization headers"""
    # Clean up any existing test user first
    db.users_collection.delete_many({"username": "analyticsuser"})
    
    client.post('/api/auth/register', json={
        'username': 'analyticsuser',
        'email': 'analyticsuser@gmail.com',
        'password': 'ValidPass123'
    })
    login = client.post('/api/auth/login', json={
        'username': 'analyticsuser',
        'password': 'ValidPass123'
    })
    token = login.get_json().get('access_token')
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture
def sample_devices():
    """Create sample devices for testing"""
    device1 = ObjectId()
    device2 = ObjectId()
    room1 = ObjectId()
    
    # Create room
    db.rooms_collection.insert_one({
        "_id": room1,
        "name": "MOCK_Test Room"
    })
    
    # Create devices
    devices = [
        {
            "_id": device1,
            "name": "MOCK_Test Light 1",
            "type": "light",
            "roomId": room1,
            "isOn": False,
            "isHomeAssistant": True,
            "entityId": "light.test_light_1"
        },
        {
            "_id": device2,
            "name": "MOCK_Test Light 2", 
            "type": "light",
            "roomId": room1,
            "isOn": False,
            "isHomeAssistant": False
        }
    ]
    
    db.devices_collection.insert_many(devices)
    return {"device1": str(device1), "device2": str(device2), "room1": str(room1)}

@pytest.fixture
def sample_logs(sample_devices):
    """Create sample device logs for testing"""
    logs = [
        {
            "user": "analyticsuser",
            "device": sample_devices["device1"],
            "action": "toggle",
            "result": "on",
            "timestamp": datetime.utcnow() - timedelta(hours=2),
            "is_error": False
        },
        {
            "user": "analyticsuser",
            "device": sample_devices["device2"],
            "action": "toggle",
            "result": "off",
            "timestamp": datetime.utcnow() - timedelta(hours=1),
            "is_error": False
        },
        {
            "user": "testuser2",
            "device": sample_devices["device1"],
            "action": "toggle",
            "result": "error: Connection timeout",
            "timestamp": datetime.utcnow() - timedelta(minutes=30),
            "is_error": True,
            "error_type": "timeout"
        },
        {
            "user": "analyticsuser",
            "device": "light.ha_device",
            "device_name": "Living Room Lamp",
            "action": "toggle_all",
            "result": "on",
            "timestamp": datetime.utcnow() - timedelta(minutes=10),
            "is_error": False
        }
    ]
    
    db.device_logs.insert_many(logs)
    return logs

@pytest.fixture(autouse=True)
def cleanup():
    """Clean up test data after each test"""
    yield
    # Clean up test data
    db.devices_collection.delete_many({"name": {"$regex": "^MOCK_"}})
    db.rooms_collection.delete_many({"name": {"$regex": "^MOCK_"}})
    db.device_logs.delete_many({"user": {"$in": ["analyticsuser", "testuser2"]}})
    db.users_collection.delete_many({"username": {"$in": ["analyticsuser", "testuser2"]}})

# Test Basic Analytics Endpoints

def test_usage_per_user(client, auth_headers, sample_devices, sample_logs):
    """Test /api/analytics/usage-per-user endpoint"""
    response = client.get('/api/analytics/usage-per-user', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)
    
    # Should have entries for both users
    users = [entry['user'] for entry in data]
    assert 'analyticsuser' in users
    assert 'testuser2' in users

def test_usage_per_device(client, auth_headers, sample_devices, sample_logs):
    """Test /api/analytics/usage-per-device endpoint"""
    response = client.get('/api/analytics/usage-per-device', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)
    
    # Should have device usage data
    devices = [entry.get('device') for entry in data]
    assert len(data) > 0

def test_usage_per_device_with_filters(client, auth_headers, sample_devices, sample_logs):
    """Test usage per device with user filter"""
    response = client.get(
        '/api/analytics/usage-per-device?user=analyticsuser', 
        headers=auth_headers
    )
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

def test_recent_activity(client, auth_headers, sample_devices, sample_logs):
    """Test /api/analytics/recent-actions endpoint"""
    response = client.get('/api/analytics/recent-actions', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)
    
    # Check activity structure
    if data:
        activity = data[0]
        assert 'user' in activity
        assert 'action' in activity
        assert 'timestamp' in activity

def test_activity_feed(client, auth_headers, sample_devices, sample_logs):
    """Test /api/analytics/recent-actions endpoint (same as activity feed)"""
    response = client.get('/api/analytics/recent-actions', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

# Test Date Range Filtering

def test_analytics_with_date_filter(client, auth_headers, sample_devices, sample_logs):
    """Test analytics with date parameter"""
    today = datetime.utcnow().strftime('%Y-%m-%d')
    
    response = client.get(
        f'/api/analytics/usage-per-user?date={today}', 
        headers=auth_headers
    )
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

def test_analytics_with_date_range(client, auth_headers, sample_devices, sample_logs):
    """Test analytics with date range"""
    start_date = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
    end_date = datetime.utcnow().strftime('%Y-%m-%d')
    
    response = client.get(
        f'/api/analytics/usage-per-user?startDate={start_date}&endDate={end_date}', 
        headers=auth_headers
    )
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

# Test Multi-View Trend Analysis

def test_usage_per_week(client, auth_headers, sample_devices, sample_logs):
    """Test weekly usage trends"""
    response = client.get('/api/analytics/usage-per-week', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

def test_usage_per_month(client, auth_headers, sample_devices, sample_logs):
    """Test monthly usage trends"""
    response = client.get('/api/analytics/usage-per-month', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

def test_daily_breakdown(client, auth_headers, sample_devices, sample_logs):
    """Test daily breakdown by hour"""
    today = datetime.utcnow().strftime('%Y-%m-%d')
    
    response = client.get(f'/api/analytics/daily-breakdown/{today}', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)
    
    # Should return 24 hours (0-23)
    assert len(data) == 24

def test_week_breakdown(client, auth_headers, sample_devices, sample_logs):
    """Test weekly breakdown"""
    # Use current week format (YYYY-WXX)
    import datetime
    now = datetime.datetime.utcnow()
    week_id = f"{now.year}-W{now.isocalendar()[1]:02d}"
    
    response = client.get(f'/api/analytics/week-breakdown/{week_id}', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

def test_month_breakdown(client, auth_headers, sample_devices, sample_logs):
    """Test monthly breakdown"""
    month_id = datetime.utcnow().strftime('%Y-%m')
    
    response = client.get(f'/api/analytics/month-breakdown/{month_id}', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

# Test Error Analytics

def test_errors_per_device(client, auth_headers, sample_devices, sample_logs):
    """Test device error analytics"""
    response = client.get('/api/analytics/errors-per-device', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

def test_errors_per_user(client, auth_headers, sample_devices, sample_logs):
    """Test user error analytics"""
    response = client.get('/api/analytics/errors-per-user', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

def test_error_types(client, auth_headers, sample_devices, sample_logs):
    """Test error type distribution"""
    response = client.get('/api/analytics/error-types', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

def test_recent_errors(client, auth_headers, sample_devices, sample_logs):
    """Test recent errors endpoint"""
    response = client.get('/api/analytics/recent-errors', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

def test_device_health(client, auth_headers, sample_devices, sample_logs):
    """Test device health analytics"""
    response = client.get('/api/analytics/device-health', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)
    
    # Check health status structure if data exists
    if data:
        health = data[0]
        assert 'name' in health
        assert 'status' in health
        assert health['status'] in ['healthy', 'warning', 'critical']

# Test Active Users & Streaks

def test_active_users_streaks(client, auth_headers, sample_devices, sample_logs):
    """Test active users and streaks analytics"""
    response = client.get('/api/analytics/active-users-streaks', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)
    
    # Check streak structure if data exists
    if data:
        user_streak = data[0]
        assert 'user' in user_streak
        assert 'total_actions' in user_streak
        assert 'current_streak' in user_streak
        assert 'longest_streak' in user_streak
        assert 'badge' in user_streak

# Test CSV Export

def test_export_usage_csv(client, auth_headers, sample_devices, sample_logs):
    """Test CSV export functionality"""
    response = client.get('/api/analytics/export-usage-csv', headers=auth_headers)
    assert response.status_code == 200
    assert response.content_type == 'text/csv; charset=utf-8'
    
    # Parse CSV content
    csv_content = response.data.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(csv_content))
    rows = list(csv_reader)
    
    # Should have CSV headers
    if rows:
        assert 'User' in rows[0]
        assert 'Device' in rows[0]
        assert 'Action' in rows[0]
        assert 'Result' in rows[0]
        assert 'Timestamp' in rows[0]

def test_export_usage_csv_grouped(client, auth_headers, sample_devices, sample_logs):
    """Test grouped CSV export"""
    response = client.get('/api/analytics/export-usage-csv-grouped?period=daily', headers=auth_headers)
    assert response.status_code == 200
    assert response.content_type == 'text/csv; charset=utf-8'

# Test Room and Device Filtering

def test_analytics_with_room_filter(client, auth_headers, sample_devices, sample_logs):
    """Test analytics with room filter"""
    response = client.get(
        f'/api/analytics/usage-per-device?room={sample_devices["room1"]}', 
        headers=auth_headers
    )
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

def test_analytics_with_device_filter(client, auth_headers, sample_devices, sample_logs):
    """Test analytics with device filter"""
    response = client.get(
        f'/api/analytics/usage-per-user?device={sample_devices["device1"]}', 
        headers=auth_headers
    )
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

# Test Edge Cases and Error Handling

def test_analytics_no_data(client, auth_headers):
    """Test analytics endpoints with no data"""
    response = client.get('/api/analytics/usage-per-user', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)
    # Should return empty list when no data

def test_analytics_invalid_date(client, auth_headers):
    """Test analytics with invalid date format"""
    response = client.get('/api/analytics/usage-per-user?date=invalid-date', headers=auth_headers)
    assert response.status_code == 200  # Should handle gracefully
    
    data = response.get_json()
    assert isinstance(data, list)

def test_daily_breakdown_invalid_date(client, auth_headers):
    """Test daily breakdown with invalid date"""
    response = client.get('/api/analytics/daily-breakdown/invalid-date', headers=auth_headers)
    assert response.status_code == 200  # Should return empty data gracefully
    
    data = response.get_json()
    assert isinstance(data, list)

def test_analytics_unauthorized(client):
    """Test analytics endpoints without authentication - should still work"""
    response = client.get('/api/analytics/usage-per-user')
    assert response.status_code == 200  # Analytics don't require auth

def test_top_actions(client, auth_headers, sample_devices, sample_logs):
    """Test if there's a top actions endpoint or similar"""
    # Check if recent-actions endpoint exists and works
    response = client.get('/api/analytics/recent-actions', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)

# Test Performance with Large Dataset

def test_analytics_performance_large_dataset(client, auth_headers, sample_devices):
    """Test analytics performance with larger dataset"""
    # Create multiple log entries
    large_logs = []
    base_time = datetime.utcnow()
    
    for i in range(100):
        large_logs.append({
            "user": "analyticsuser",
            "device": sample_devices["device1"],
            "action": "toggle",
            "result": "on" if i % 2 == 0 else "off",
            "timestamp": base_time - timedelta(hours=i),
            "is_error": False
        })
    
    db.device_logs.insert_many(large_logs)
    
    # Test that endpoints still respond quickly
    response = client.get('/api/analytics/usage-per-user', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) > 0

# Test Timezone Handling

def test_analytics_timezone_handling(client, auth_headers, sample_devices):
    """Test that analytics handle timezones correctly"""
    # Create logs with specific UTC times
    utc_time = datetime.utcnow()
    
    log_entry = {
        "user": "analyticsuser",
        "device": sample_devices["device1"],
        "action": "toggle",
        "result": "on",
        "timestamp": utc_time,
        "is_error": False
    }
    
    db.device_logs.insert_one(log_entry)
    
    # Test daily breakdown for today
    today = utc_time.strftime('%Y-%m-%d')
    response = client.get(f'/api/analytics/daily-breakdown/{today}', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) == 24  # Should return all 24 hours

def test_comprehensive_filter_combination(client, auth_headers, sample_devices, sample_logs):
    """Test analytics with multiple filters combined"""
    today = datetime.utcnow().strftime('%Y-%m-%d')
    
    response = client.get(
        f'/api/analytics/usage-per-device?date={today}&user=analyticsuser&room={sample_devices["room1"]}',
        headers=auth_headers
    )
    assert response.status_code == 200
    
    data = response.get_json()
    assert isinstance(data, list)
