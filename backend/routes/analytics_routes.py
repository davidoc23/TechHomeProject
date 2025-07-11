from collections import defaultdict 
from flask import Blueprint, jsonify, request
from bson import ObjectId
from datetime import datetime, timedelta
from pytz import timezone, utc
import db
from flask import Response
import csv
import io

analytics_routes = Blueprint('analytics_routes', __name__)

def get_date_range():
    """
    Return (start, end) datetimes in UTC for a single date or a start/end range.
    - If both startDate and endDate (YYYY-MM-DD) are provided, use as range (inclusive of start, exclusive of end+1).
    - If only date is provided, use that single day.
    - Returns UTC-aware datetimes.
    """
    irl = timezone('Europe/Dublin')
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')
    date_str = request.args.get('date')

    try:
        if start_date_str and end_date_str:
            start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date_str, "%Y-%m-%d")
            start_irl = irl.localize(start_dt.replace(hour=0, minute=0, second=0, microsecond=0))
            end_irl = irl.localize(end_dt.replace(hour=0, minute=0, second=0, microsecond=0)) + timedelta(days=1)
            # End is exclusive, so add a day to cover the last day fully
            start_utc = start_irl.astimezone(utc)
            end_utc = end_irl.astimezone(utc)
            return start_utc, end_utc
        elif date_str:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            start_irl = irl.localize(dt.replace(hour=0, minute=0, second=0, microsecond=0))
            end_irl = start_irl + timedelta(days=1)
            start_utc = start_irl.astimezone(utc)
            end_utc = end_irl.astimezone(utc)
            return start_utc, end_utc
        else:
            return None, None
    except Exception as e:
        print("[get_date_range] Date parse error:", e)
        return None, None

def apply_device_room_filters(match):
    """
    Apply device and room filters to a MongoDB match query.
    """
    device = request.args.get('device')
    room = request.args.get('room')
    
    if device and device != 'ALL':
        # Check if device is an ObjectId or entityId
        device_ids = [device]
        
        # Try to find the device and add both _id and entityId for matching
        try:
            if ObjectId.is_valid(device):
                # If it's a valid ObjectId, find the device and add its entityId too
                device_doc = db.devices_collection.find_one({"_id": ObjectId(device)})
                if device_doc and "entityId" in device_doc:
                    device_ids.append(device_doc["entityId"])
            else:
                # If it's an entityId, find the device and add its _id too
                device_doc = db.devices_collection.find_one({"entityId": device})
                if device_doc:
                    device_ids.append(str(device_doc["_id"]))
        except Exception as e:
            print("[apply_device_room_filters] Device lookup error:", e)
        
        match["device"] = {"$in": device_ids} if len(device_ids) > 1 else device
        
    elif room and room != 'ALL':
        # Get all devices in the specified room
        try:
            room_devices = list(db.devices_collection.find({"roomId": ObjectId(room)}))
            device_ids = []
            for d in room_devices:
                device_ids.append(str(d["_id"]))
                if "entityId" in d:
                    device_ids.append(d["entityId"])
            if device_ids:
                match["device"] = {"$in": device_ids}
            else:
                # No devices in room, return empty results
                match["device"] = {"$in": []}
        except Exception as e:
            print("[apply_device_room_filters] Room filter error:", e)
            match["device"] = {"$in": []}
    
    return match

# Devices List Endpoint
@analytics_routes.route('/devices', methods=['GET'])
def get_devices():
    """Get list of all devices for filtering dropdown"""
    try:
        devices = list(db.devices_collection.find())
        device_list = []
        seen_names = set()  # Track device names to avoid duplicates
        
        for d in devices:
            device_name = d.get("name", str(d["_id"]))
            
            # Add device with _id as primary identifier
            if device_name not in seen_names:
                device_list.append({
                    "id": str(d["_id"]),
                    "name": device_name,
                    "entityId": d.get("entityId")
                })
                seen_names.add(device_name)
            
            # Only add entityId as separate entry if it's significantly different and has a different name
            if "entityId" in d and d["entityId"] != str(d["_id"]):
                entity_name = d.get("name", d["entityId"])
                if entity_name not in seen_names and entity_name != device_name:
                    device_list.append({
                        "id": d["entityId"],
                        "name": entity_name,
                        "entityId": d.get("entityId")
                    })
                    seen_names.add(entity_name)
        
        # Sort by name for better UX
        device_list.sort(key=lambda x: x["name"].lower())
        return jsonify(device_list)
    except Exception as e:
        print("[get_devices] Error:", e)
        return jsonify([])

# Rooms List Endpoint
@analytics_routes.route('/rooms', methods=['GET'])
def get_rooms():
    """Get list of all rooms for filtering dropdown"""
    try:
        rooms = list(db.rooms_collection.find())
        room_list = []
        for r in rooms:
            room_list.append({
                "id": str(r["_id"]),
                "name": r.get("name", str(r["_id"]))
            })
        return jsonify(room_list)
    except Exception as e:
        print("[get_rooms] Error:", e)
        return jsonify([])

# Users List Endpoint
@analytics_routes.route('/users', methods=['GET'])
def get_users():
    users = db.device_logs.distinct('user')
    users = [u for u in users if u and u.strip()]
    users.sort()
    return jsonify(users)

# Usage Per User
@analytics_routes.route('/usage-per-user', methods=['GET'])
def usage_per_user():
    start, end = get_date_range()
    match = {}
    if start and end:
        match["timestamp"] = {"$gte": start, "$lt": end}
    user = request.args.get('user')
    if user and user != 'ALL':
        match["user"] = user
    # Apply device/room filters
    match = apply_device_room_filters(match)
    pipeline = []
    if match:
        pipeline.append({"$match": match})
    pipeline += [
        {"$group": {"_id": "$user", "action_count": {"$sum": 1}}},
        {"$sort": {"action_count": -1}}
    ]
    results = list(db.device_logs.aggregate(pipeline))
    data = [{"user": r["_id"], "actions": r["action_count"]} for r in results]
    return jsonify(data)

# Usage Per Device (with device name)
@analytics_routes.route('/usage-per-device', methods=['GET'])
def usage_per_device():
    start, end = get_date_range()
    match = {}
    if start and end:
        match["timestamp"] = {"$gte": start, "$lt": end}
    user = request.args.get('user')
    if user and user != 'ALL':
        match["user"] = user
    # Apply device/room filters
    match = apply_device_room_filters(match)
    pipeline = []
    if match:
        pipeline.append({"$match": match})
    pipeline += [
        {"$group": {"_id": "$device", "actions": {"$sum": 1}}},
        {"$sort": {"actions": -1}}
    ]
    results = list(db.device_logs.aggregate(pipeline))
    object_ids = []
    entity_ids = []
    for r in results:
        if ObjectId.is_valid(r["_id"]):
            object_ids.append(ObjectId(r["_id"]))
        else:
            entity_ids.append(r["_id"])
    device_name_map = {}
    for d in db.devices_collection.find({"_id": {"$in": object_ids}}):
        device_name_map[str(d["_id"])] = d.get("name", str(d["_id"]))
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
    start, end = get_date_range()
    match = {"device": device_id}
    if start and end:
        match["timestamp"] = {"$gte": start, "$lt": end}
    pipeline = [
        {"$match": match},
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
    start, end = get_date_range()
    match = {"user": username}
    if start and end:
        match["timestamp"] = {"$gte": start, "$lt": end}
    pipeline = [
        {"$match": match},
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
    start, end = get_date_range()
    match = {"device": device_id}
    if start and end:
        match["timestamp"] = {"$gte": start, "$lt": end}
    pipeline = [
        {"$match": match},
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
    start, end = get_date_range()
    match = {"user": username}
    if start and end:
        match["timestamp"] = {"$gte": start, "$lt": end}
    pipeline = [
        {"$match": match},
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
    start, end = get_date_range()
    q = {}
    if start and end:
        q["timestamp"] = {"$gte": start, "$lt": end}
    user = request.args.get('user')
    if user and user != 'ALL':
        q["user"] = user
    # Apply device/room filters
    q = apply_device_room_filters(q)
    logs = list(db.device_logs.find(q).sort("timestamp", -1).limit(20))
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

    window_size = 2  # seconds for grouping
    toggle_groups = defaultdict(list)
    for log in logs:
        if log.get("action") == "toggle_all" and log.get("timestamp"):
            t = log["timestamp"].replace(microsecond=0)
            floored_seconds = t.second - (t.second % window_size)
            bucket = t.replace(second=floored_seconds)
            key = (log.get("user"), bucket, "toggle_all")
            toggle_groups[key].append(log)

    grouped = []
    used_log_ids = set()
    for (user, bucket, _), group in toggle_groups.items():
        grouped.append({
            "user": user,
            "action": "toggle_all",
            "devices": [get_friendly_name(l) for l in group],
            "result": group[0].get("result", ""),
            "timestamp": group[0].get("timestamp").isoformat() if group[0].get("timestamp") else "",
            "grouped": True
        })
        used_log_ids.update(id(log) for log in group)

    for log in logs:
        if not (log.get("action") == "toggle_all" and id(log) in used_log_ids):
            grouped.append({
                "user": log.get("user", "unknown"),
                "action": log.get("action", ""),
                "device_name": get_friendly_name(log),
                "result": log.get("result", ""),
                "timestamp": log.get("timestamp").isoformat() if log.get("timestamp") else "",
                "grouped": False
            })
    grouped.sort(key=lambda x: x["timestamp"], reverse=True)
    return jsonify(grouped[:5])

# Usage Per Hour 
@analytics_routes.route('/usage-per-hour', methods=['GET'])
def usage_per_hour():
    start, end = get_date_range()
    irl = timezone('Europe/Dublin')
    q = {}
    if start and end:
        q["timestamp"] = {"$gte": start, "$lt": end}
    user = request.args.get('user')
    if user and user != 'ALL':
        q["user"] = user
    # Apply device/room filters
    q = apply_device_room_filters(q)
    logs = list(db.device_logs.find(q))
    hour_counts = [0] * 24
    for log in logs:
        ts = log.get("timestamp")
        if ts:
            local_hour = ts.astimezone(irl).hour
            hour_counts[local_hour] += 1
    data = [{"hour": h, "actions": hour_counts[h]} for h in range(24)]
    return jsonify(data)

# Actions in Hour 
@analytics_routes.route('/actions-in-hour/<int:hour>', methods=['GET'])
def actions_in_hour(hour):
    irl = timezone('Europe/Dublin')
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')
    date_str = request.args.get('date')
    user = request.args.get('user')
    logs = []
    def add_user_filter(q):
        if user and user != 'ALL':
            q['user'] = user
        # Apply device/room filters
        q = apply_device_room_filters(q)
        return q
    if start_date_str and end_date_str:
        try:
            start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date_str, "%Y-%m-%d")
            for n in range((end_dt - start_dt).days + 1):
                dt = start_dt + timedelta(days=n)
                start_local = irl.localize(dt.replace(hour=0, minute=0, second=0, microsecond=0))
                end_local = start_local + timedelta(days=1)
                start_utc = start_local.astimezone(utc)
                end_utc = end_local.astimezone(utc)
                q = {"timestamp": {"$gte": start_utc, "$lt": end_utc}}
                q = add_user_filter(q)
                day_logs = list(db.device_logs.find(q).sort("timestamp", 1))
                day_logs = [
                    log for log in day_logs
                    if log.get("timestamp") and log["timestamp"].astimezone(irl).hour == hour
                ]
                logs.extend(day_logs)
        except Exception as e:
            print("[actions-in-hour] Date range parse error:", e)
            logs = []
    elif date_str:
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            start_local = irl.localize(dt.replace(hour=0, minute=0, second=0, microsecond=0))
            end_local = start_local + timedelta(days=1)
            start_utc = start_local.astimezone(utc)
            end_utc = end_local.astimezone(utc)
            q = {"timestamp": {"$gte": start_utc, "$lt": end_utc}}
            q = add_user_filter(q)
            logs = list(db.device_logs.find(q).sort("timestamp", 1))
            logs = [
                log for log in logs
                if log.get("timestamp") and log["timestamp"].astimezone(irl).hour == hour
            ]
        except Exception as e:
            print("[actions-in-hour] Date parse error:", e)
            logs = []
    else:
        now = datetime.now(irl)
        start_local = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_local = start_local + timedelta(days=1)
        start_utc = start_local.astimezone(utc)
        end_utc = end_local.astimezone(utc)
        q = {"timestamp": {"$gte": start_utc, "$lt": end_utc}}
        q = add_user_filter(q)
        logs = list(db.device_logs.find(q).sort("timestamp", 1))
        logs = [
            log for log in logs
            if log.get("timestamp") and log["timestamp"].astimezone(irl).hour == hour
        ]

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

    def serialize(log):
        ts = log.get("timestamp")
        return {
            "user": log.get("user", "unknown"),
            "device": log.get("device", ""),
            "device_name": get_friendly_name(log),
            "action": log.get("action", ""),
            "result": log.get("result", ""),
            "timestamp": ts.isoformat() if ts else "",
            "date": ts.astimezone(irl).strftime("%Y-%m-%d") if ts else ""
        }
    return jsonify([serialize(l) for l in logs])

@analytics_routes.route('/export-usage-csv', methods=['GET'])
def export_usage_csv():
    # Support single date or date range
    date_str = request.args.get('date')
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')
    user = request.args.get('user')
    irl = timezone('Europe/Dublin')
    query = {}

    if start_date_str and end_date_str:
        try:
            start_dt = irl.localize(datetime.strptime(start_date_str, "%Y-%m-%d"))
            end_dt = irl.localize(datetime.strptime(end_date_str, "%Y-%m-%d")) + timedelta(days=1)
            start_utc = start_dt.astimezone(utc)
            end_utc = end_dt.astimezone(utc)
            query['timestamp'] = {'$gte': start_utc, '$lt': end_utc}
        except Exception:
            pass
    elif date_str:
        try:
            dt = irl.localize(datetime.strptime(date_str, "%Y-%m-%d"))
            start_utc = dt.astimezone(utc)
            end_utc = (dt + timedelta(days=1)).astimezone(utc)
            query['timestamp'] = {'$gte': start_utc, '$lt': end_utc}
        except Exception:
            pass
    # If no date/range params, export all logs.

    # Apply user filter if present
    if user and user != 'ALL':
        query['user'] = user

    # Apply device/room filters
    query = apply_device_room_filters(query)

    logs = list(db.device_logs.find(query).sort('timestamp', 1))
    
    if not logs:
        return jsonify({"error": "No logs found for the selected date or range."}), 404

    # Build device lookup for friendly names
    try:
        all_devices = list(db.devices_collection.find({}))
    except Exception:
        all_devices = []
    
    device_lookup = {}
    for d in all_devices:
        device_lookup[str(d["_id"])] = d.get("name", str(d["_id"]))
        if "entityId" in d:
            device_lookup[d["entityId"]] = d.get("name", d.get("entityId"))

    def get_friendly_name(device_id):
        return device_lookup.get(device_id, device_id)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['User', 'Device', 'Action', 'Result', 'Timestamp'])
    for log in logs:
        ts = log.get('timestamp', '')
        if isinstance(ts, datetime):
            ts_str = ts.astimezone(irl).strftime('%Y-%m-%d %H:%M:%S')
        else:
            ts_str = str(ts)
        
        device_id = log.get('device', '')
        device_name = get_friendly_name(device_id)
        
        writer.writerow([
            log.get('user', ''),
            device_name,  # Use friendly name instead of device ID
            log.get('action', ''),
            log.get('result', ''),
            ts_str
        ])
    
    output.seek(0)
    return Response(output.getvalue(),
                    mimetype="text/csv",
                    headers={"Content-Disposition": "attachment;filename=techhome_usage_logs.csv"})
