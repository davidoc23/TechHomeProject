from collections import defaultdict
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

    # Separate ids that are valid ObjectId and those that are not (assume entityId)
    object_ids = []
    entity_ids = []
    for r in results:
        if ObjectId.is_valid(r["_id"]):
            object_ids.append(ObjectId(r["_id"]))
        else:
            entity_ids.append(r["_id"])
    
    # Query both by _id and by entityId
    device_name_map = {}
    # Find local (ObjectId) devices
    for d in db.devices_collection.find({"_id": {"$in": object_ids}}):
        device_name_map[str(d["_id"])] = d.get("name", str(d["_id"]))
    # Find Home Assistant (entityId) devices
    if entity_ids:
        for d in db.devices_collection.find({"entityId": {"$in": entity_ids}}):
            device_name_map[d.get("entityId")] = d.get("name", d.get("entityId"))

    data = []
    for r in results:
        name = device_name_map.get(r["_id"], r["_id"])
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

# Top Actions for Device
@analytics_routes.route('/device-actions/<device_id>/top', methods=['GET'])
def device_top_actions(device_id):
    pipeline = [
        {"$match": {"device": device_id}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 3}
    ]
    result = list(db.device_logs.aggregate(pipeline))
    return jsonify([
        {"action": row["_id"], "count": row["count"]}
        for row in result
    ])

# Top Actions for User
@analytics_routes.route('/user-actions/<username>/top', methods=['GET'])
def user_top_actions(username):
    pipeline = [
        {"$match": {"user": username}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 3}
    ]
    result = list(db.device_logs.aggregate(pipeline))
    return jsonify([
        {"action": row["_id"], "count": row["count"]}
        for row in result
    ])

# Recent Actions
@analytics_routes.route('/recent-actions', methods=['GET'])
def recent_actions():
    logs = list(db.device_logs.find().sort("timestamp", -1).limit(5))

    # Collect all device references for lookup
    object_ids = set()
    entity_ids = set()
    for log in logs:
        dev = log.get("device")
        if dev:
            if ObjectId.is_valid(dev):
                object_ids.add(ObjectId(dev))
            else:
                entity_ids.add(dev)
    lookup_query = []
    if object_ids:
        lookup_query.append({"_id": {"$in": list(object_ids)}})
    if entity_ids:
        lookup_query.append({"entityId": {"$in": list(entity_ids)}})
    if lookup_query:
        all_devices = db.devices_collection.find({"$or": lookup_query})
    else:
        all_devices = []
    device_lookup = {}
    for d in all_devices:
        device_lookup[str(d["_id"])] = d.get("name", str(d["_id"]))
        if "entityId" in d:
            device_lookup[d["entityId"]] = d.get("name", d.get("entityId"))

    def get_friendly_name(log):
        dev_id = log.get("device", "")
        return device_lookup.get(dev_id, dev_id)

    # Group toggle_all actions by (user, timestamp (up to seconds), action)
    grouped = []
    toggle_groups = defaultdict(list)
    seen_indices = set()

    for idx, log in enumerate(logs):
        if log.get("action") == "toggle_all":
            t = log.get("timestamp")
            ts_str = t.replace(microsecond=0).isoformat() if t else ""
            key = (log.get("user"), ts_str, log.get("action"))
            toggle_groups[key].append(log)
            seen_indices.add(idx)

    # Create grouped toggle_all entries
    for key, group in toggle_groups.items():
        grouped.append({
            "user": key[0],
            "action": "toggle_all",
            "devices": [get_friendly_name(l) for l in group],
            "result": group[0].get("result", ""),
            "timestamp": group[0].get("timestamp").isoformat() if group[0].get("timestamp") else "",
            "grouped": True
        })

    # Add non-toggle_all actions that weren't part of a group
    for idx, log in enumerate(logs):
        if log.get("action") != "toggle_all" or idx not in seen_indices:
            grouped.append({
                "user": log.get("user", "unknown"),
                "action": log.get("action", ""),
                "device_name": get_friendly_name(log),
                "result": log.get("result", ""),
                "timestamp": log.get("timestamp").isoformat() if log.get("timestamp") else "",
                "grouped": False
            })

    # Sort by timestamp descending and limit to 5 items
    grouped.sort(key=lambda x: x["timestamp"], reverse=True)
    return jsonify(grouped[:5])