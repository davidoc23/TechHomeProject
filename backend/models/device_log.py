from datetime import datetime
import db

def log_device_action(user, device, action, result):
    # DEBUG - print("About to log to MongoDB")
    # Safe fallback values for all fields
    user = user or "unknown"
    device = device or "unknown"
    action = action or "unknown"
    result = result or "unknown"

    # Insert into device_logs collection
    db.device_logs.insert_one({
        "user": user,  
        "device": device,
        "action": action,
        "result": result,
        "timestamp": datetime.utcnow()
    })
