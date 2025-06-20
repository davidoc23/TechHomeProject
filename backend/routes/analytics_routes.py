from flask import Blueprint, jsonify
import db 

analytics_routes = Blueprint('analytics_routes', __name__)

@analytics_routes.route('/usage-per-user', methods=['GET'])
def usage_per_user():
    
    # Aggregate logs by user and count their actions
    pipeline = [
        {"$group": {"_id": "$user", "action_count": {"$sum": 1}}},
        {"$sort": {"action_count": -1}}
    ]
    results = list(db.device_logs.aggregate(pipeline))
    
    # Format for frontend or screenshot
    data = [{"user": r["_id"], "actions": r["action_count"]} for r in results]
    return jsonify(data)
