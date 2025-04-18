import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from datetime import datetime, timedelta
import joblib
import os
from bson import ObjectId

# Import the database connection
import db

class DeviceUsagePredictor:
    """
    Machine learning model to predict device usage patterns
    based on historical data, time of day, and day of week.
    """
    
    def __init__(self):
        self.model = None
        self.device_models = {}  # Store models for each device
        self.model_dir = os.path.join(os.path.dirname(__file__), 'models')
        
        # Create models directory if it doesn't exist
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)
    
    def _prepare_data_for_device(self, device_id):
        """Prepare training data for a specific device"""
        
        # Get device usage history from database
        device_history = list(db.device_history_collection.find({"device_id": ObjectId(device_id)}))
        
        if len(device_history) < 10:
            print(f"Not enough history for device {device_id} to train model")
            return None
            
        # Create dataset from history
        data = []
        for entry in device_history:
            timestamp = entry.get('timestamp', datetime.utcnow())
            if not isinstance(timestamp, datetime):
                timestamp = datetime.fromisoformat(timestamp)
                
            # Features: hour of day, day of week, previous state
            data.append({
                'hour': timestamp.hour,
                'day_of_week': timestamp.weekday(),
                'is_weekend': 1 if timestamp.weekday() >= 5 else 0,
                'previous_state': 1 if entry.get('previous_state', False) else 0,
                'state': 1 if entry.get('state', False) else 0
            })
        
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        if df.empty:
            return None
            
        # Features and target
        X = df[['hour', 'day_of_week', 'is_weekend', 'previous_state']]
        y = df['state']
        
        return X, y
    
    def train_model_for_device(self, device_id):
        """Train a prediction model for a specific device"""
        
        data = self._prepare_data_for_device(device_id)
        if data is None:
            print(f"Could not prepare data for device {device_id}")
            return False
            
        X, y = data
        
        # Create a pipeline with preprocessing and model
        model = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
        ])
        
        # Train the model
        model.fit(X, y)
        
        # Save the model
        model_path = os.path.join(self.model_dir, f'device_{device_id}.joblib')
        joblib.dump(model, model_path)
        
        # Store in memory too
        self.device_models[device_id] = model
        
        return True
    
    def predict_device_state(self, device_id, time=None):
        """Predict if a device should be on or off at a given time"""
        
        if time is None:
            time = datetime.utcnow()
            
        # Check if model exists
        model_path = os.path.join(self.model_dir, f'device_{device_id}.joblib')
        
        if device_id not in self.device_models and os.path.exists(model_path):
            self.device_models[device_id] = joblib.load(model_path)
        elif device_id not in self.device_models:
            # Train a new model
            success = self.train_model_for_device(device_id)
            if not success:
                print(f"Could not train model for device {device_id}")
                return None
        
        model = self.device_models[device_id]
        
        # Get device current state
        device = db.devices_collection.find_one({"_id": ObjectId(device_id)})
        if not device:
            return None
            
        previous_state = device.get('isOn', False)
        
        # Create input features
        input_features = np.array([[
            time.hour,
            time.weekday(),
            1 if time.weekday() >= 5 else 0,
            1 if previous_state else 0
        ]])
        
        # Predict
        prediction = model.predict(input_features)[0]
        probability = model.predict_proba(input_features)[0][1]  # Probability of ON
        
        return {
            'prediction': bool(prediction),
            'probability': float(probability),
            'current_state': bool(previous_state)
        }

# Initialize the predictor
device_predictor = DeviceUsagePredictor()

def update_device_history(device_id, state, user_id=None):
    """
    Record device state changes to build training data
    """
    device_id_obj = ObjectId(device_id) if not isinstance(device_id, ObjectId) else device_id
    
    # Get current device state (before change)
    device = db.devices_collection.find_one({"_id": device_id_obj})
    previous_state = device.get('isOn', False) if device else False
    
    # Log the state change
    history_entry = {
        'device_id': device_id_obj,
        'timestamp': datetime.utcnow(),
        'previous_state': previous_state,
        'state': state,
        'user_id': user_id
    }
    
    # Add to history collection
    db.device_history_collection.insert_one(history_entry)
    
    # Try to train/update the model
    try:
        device_predictor.train_model_for_device(str(device_id))
    except Exception as e:
        print(f"Error training model for device {device_id}: {e}")

def get_device_suggestions():
    """Get AI suggestions for device states"""
    return device_predictor.get_device_suggestions()