from flask import Blueprint, jsonify
from bson import ObjectId
import db

analytics_routes = Blueprint('analytics_routes', __name__)

# Usage Per User
@analytics_routes.route('/usage-per-user', methods=['GET'])
def usage_per_user():
    pipeline = [
        {"$group": {"_id": "$user", "action_count": {"$sum": 1}}},
        {"$sort": {"action_count": -1}}
    ]
    results = list(db.device_logs.aggregate(pipeline))
    data = [{"user": r["_id"], "actions": r["action_count"]} for r in results]
    return jsonify(data)

# Usage Per Device (with device name)
@analytics_routes.route('/usage-per-device', methods=['GET'])
def usage_per_device():
    pipeline = [
        {"$group": {"_id": "$device", "actions": {"$sum": 1}}},
        {"$sort": {"actions": -1}}
    ]
    results = list(db.device_logs.aggregate(pipeline))

    device_ids = [ObjectId(r["_id"]) for r in results if ObjectId.is_valid(r["_id"])]
    device_lookup = {str(d["_id"]): d.get("name", str(d["_id"])) for d in db.devices_collection.find({"_id": {"$in": device_ids}})}
    
    data = []
    for r in results:
        name = device_lookup.get(r["_id"], r["_id"])  # fallback to ID if no name
        data.append({"device": r["_id"], "actions": r["actions"], "name": name})
    return jsonify(data)

# Most Frequent Action for a Device
@analytics_routes.route('/device-actions/<device_id>', methods=['GET'])
def device_actions(device_id):
    pipeline = [
        {"$match": {"device": device_id}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1}
    ]
    result = list(db.device_logs.aggregate(pipeline))
    if not result:
        return jsonify({"action": None, "count": 0})
    return jsonify({"action": result[0]["_id"], "count": result[0]["count"]})

# Most Frequent Action for a User
@analytics_routes.route('/user-actions/<username>', methods=['GET'])
def user_actions(username):
    pipeline = [
        {"$match": {"user": username}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1}
    ]
    result = list(db.device_logs.aggregate(pipeline))
    if not result:
        return jsonify({"action": None, "count": 0})
    return jsonify({"action": result[0]["_id"], "count": result[0]["count"]})

