from datetime import datetime, timezone
import db

def log_device_action(user, device, action, result, is_error=False, error_type=None):
    # DEBUG - print("About to log to MongoDB")
    # Safe fallback values for all fields
    user = user or "unknown"
    device = device or "unknown"
    action = action or "unknown"
    result = result or "unknown"
    
    # Determine if this is an error based on result content
    if not is_error and result and ("error" in result.lower() or "failed" in result.lower() or "timeout" in result.lower()):
        is_error = True
        if "timeout" in result.lower():
            error_type = "timeout"
        elif "not found" in result.lower():
            error_type = "device_not_found"
        elif "connection" in result.lower():
            error_type = "connection_error"
        else:
            error_type = "general_error"

    # Insert into device_logs collection
    log_entry = {
        "user": user,  
        "device": device,
        "action": action,
        "result": result,
        "timestamp": datetime.now(timezone.utc),
        "is_error": is_error
    }
    
    if error_type:
        log_entry["error_type"] = error_type
    
    db.device_logs.insert_one(log_entry)
