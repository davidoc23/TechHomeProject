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
# Usage Per Week
@analytics_routes.route('/usage-per-week', methods=['GET'])
def usage_per_week():
    """
    Group usage data by week within the given date range.
    Returns week periods with action counts.
    """
    start, end = get_date_range()
    if not start or not end:
        # Default to last 8 weeks if no range specified
        end = datetime.now(utc)
        start = end - timedelta(weeks=8)
    
    match = {"timestamp": {"$gte": start, "$lt": end}}
    
    # Apply user filter
    user = request.args.get('user')
    if user and user != 'ALL':
        match["user"] = user
    
    # Apply device/room filters
    match = apply_device_room_filters(match)
    
    pipeline = [
        {"$match": match},
        {
            "$addFields": {
                "week": {
                    "$dateToString": {
                        "format": "%Y-W%U",
                        "date": "$timestamp",
                        "timezone": "Europe/Dublin"
                    }
                },
                "year": {"$year": {"date": "$timestamp", "timezone": "Europe/Dublin"}},
                "weekNum": {"$week": {"date": "$timestamp", "timezone": "Europe/Dublin"}}
            }
        },
        {
            "$group": {
                "_id": "$week",
                "actions": {"$sum": 1},
                "year": {"$first": "$year"},
                "weekNum": {"$first": "$weekNum"}
            }
        },
        {"$sort": {"year": 1, "weekNum": 1}}
    ]
    
    results = list(db.device_logs.aggregate(pipeline))
    
    # Format the results with readable week labels
    data = []
    for r in results:
        week_label = r["_id"]
        # Convert to more readable format like "Week 1, 2025"
        if r.get("weekNum") is not None and r.get("year") is not None:
            week_label = f"Week {r['weekNum']}, {r['year']}"
        
        data.append({
            "period": week_label,
            "week": r["_id"],
            "actions": r["actions"]
        })
    
    return jsonify(data)

# Usage Per Month
@analytics_routes.route('/usage-per-month', methods=['GET'])
def usage_per_month():
    """
    Group usage data by month within the given date range.
    Returns month periods with action counts.
    """
    start, end = get_date_range()
    if not start or not end:
        # Default to last 12 months if no range specified
        end = datetime.now(utc)
        start = end - timedelta(days=365)
    
    match = {"timestamp": {"$gte": start, "$lt": end}}
    
    # Apply user filter
    user = request.args.get('user')
    if user and user != 'ALL':
        match["user"] = user
    
    # Apply device/room filters
    match = apply_device_room_filters(match)
    
    pipeline = [
        {"$match": match},
        {
            "$addFields": {
                "month": {
                    "$dateToString": {
                        "format": "%Y-%m",
                        "date": "$timestamp",
                        "timezone": "Europe/Dublin"
                    }
                },
                "year": {"$year": {"date": "$timestamp", "timezone": "Europe/Dublin"}},
                "monthNum": {"$month": {"date": "$timestamp", "timezone": "Europe/Dublin"}}
            }
        },
        {
            "$group": {
                "_id": "$month",
                "actions": {"$sum": 1},
                "year": {"$first": "$year"},
                "monthNum": {"$first": "$monthNum"}
            }
        },
        {"$sort": {"year": 1, "monthNum": 1}}
    ]
    
    results = list(db.device_logs.aggregate(pipeline))
    
    # Format the results with readable month labels
    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    
    data = []
    for r in results:
        month_label = r["_id"]
        # Convert to more readable format like "January 2025"
        if r.get("monthNum") is not None and r.get("year") is not None:
            month_name = month_names[r["monthNum"] - 1] if 1 <= r["monthNum"] <= 12 else f"Month {r['monthNum']}"
            month_label = f"{month_name} {r['year']}"
        
        data.append({
            "period": month_label,
            "month": r["_id"],
            "actions": r["actions"]
        })
    
    return jsonify(data)

# Export CSV with grouping support
@analytics_routes.route('/export-usage-csv-grouped', methods=['GET'])
def export_usage_csv_grouped():
    """
    Export usage data as CSV with optional grouping by day/week/month.
    Supports 'groupBy' parameter: 'day', 'week', 'month'
    """
    # Get grouping parameter
    group_by = request.args.get('groupBy', 'day').lower()
    if group_by not in ['day', 'week', 'month']:
        group_by = 'day'
    
    # Get date range
    start, end = get_date_range()
    irl = timezone('Europe/Dublin')
    query = {}

    if start and end:
        query['timestamp'] = {'$gte': start, '$lt': end}
    
    # Apply user filter
    user = request.args.get('user')
    if user and user != 'ALL':
        query['user'] = user

    # Apply device/room filters
    query = apply_device_room_filters(query)

    if group_by == 'day':
        # Use existing logic for daily export
        logs = list(db.device_logs.find(query).sort('timestamp', 1))
        
        if not logs:
            return jsonify({"error": "No logs found for the selected criteria."}), 404

        # Build device lookup
        all_devices = list(db.devices_collection.find({}))
        device_lookup = {}
        for d in all_devices:
            device_lookup[str(d["_id"])] = d.get("name", str(d["_id"]))
            if "entityId" in d:
                device_lookup[d["entityId"]] = d.get("name", d.get("entityId"))

        def get_friendly_name(device_id):
            return device_lookup.get(device_id, device_id)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Date', 'User', 'Device', 'Action', 'Result', 'Timestamp'])
        
        for log in logs:
            ts = log.get('timestamp', '')
            if isinstance(ts, datetime):
                ts_str = ts.astimezone(irl).strftime('%Y-%m-%d %H:%M:%S')
                date_str = ts.astimezone(irl).strftime('%Y-%m-%d')
            else:
                ts_str = str(ts)
                date_str = ''
            
            device_id = log.get('device', '')
            device_name = get_friendly_name(device_id)
            
            writer.writerow([
                date_str,
                log.get('user', ''),
                device_name,
                log.get('action', ''),
                log.get('result', ''),
                ts_str
            ])
    
    else:
        # Grouped export (weekly/monthly)
        if group_by == 'week':
            group_format = "%Y-W%U"
            period_label = "Week"
        else:  # monthly
            group_format = "%Y-%m" 
            period_label = "Month"
        
        pipeline = [
            {"$match": query},
            {
                "$addFields": {
                    "period": {
                        "$dateToString": {
                            "format": group_format,
                            "date": "$timestamp",
                            "timezone": "Europe/Dublin"
                        }
                    }
                }
            },
            {
                "$group": {
                    "_id": {
                        "period": "$period",
                        "user": "$user",
                        "device": "$device"
                    },
                    "actions": {"$sum": 1}
                }
            },
            {"$sort": {"_id.period": 1, "_id.user": 1, "_id.device": 1}}
        ]
        
        results = list(db.device_logs.aggregate(pipeline))
        
        if not results:
            return jsonify({"error": "No logs found for the selected criteria."}), 404
        
        # Build device lookup
        all_devices = list(db.devices_collection.find({}))
        device_lookup = {}
        for d in all_devices:
            device_lookup[str(d["_id"])] = d.get("name", str(d["_id"]))
            if "entityId" in d:
                device_lookup[d["entityId"]] = d.get("name", d.get("entityId"))

        def get_friendly_name(device_id):
            return device_lookup.get(device_id, device_id)
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([period_label, 'User', 'Device', 'Total Actions'])
        
        for result in results:
            period = result["_id"]["period"]
            user = result["_id"]["user"]
            device_id = result["_id"]["device"]
            device_name = get_friendly_name(device_id)
            actions = result["actions"]
            
            writer.writerow([period, user, device_name, actions])
    
    output.seek(0)
    filename = f"techhome_usage_logs_{group_by}.csv"
    return Response(output.getvalue(),
                    mimetype="text/csv",
                    headers={"Content-Disposition": f"attachment;filename={filename}"})

# Week Breakdown - Get daily breakdown for a specific week
@analytics_routes.route('/week-breakdown/<week_id>', methods=['GET'])
def week_breakdown(week_id):
    """
    Get daily breakdown for a specific week.
    week_id format: "2025-W28" (year-week)
    """
    try:
        # Parse week_id like "2025-W28"
        year_part, week_part = week_id.split('-W')
        year = int(year_part)
        week_num = int(week_part)
        
        # Calculate start and end dates for the week
        import calendar
        irl = timezone('Europe/Dublin')
        
        # January 1st of the year
        jan_1 = datetime(year, 1, 1)
        
        # Find the first Monday of the year (start of week 1)
        days_to_monday = (7 - jan_1.weekday()) % 7
        if jan_1.weekday() != 0:  # If Jan 1 is not Monday
            days_to_monday = 7 - jan_1.weekday()
        
        first_monday = jan_1 + timedelta(days=days_to_monday)
        
        # Calculate start of target week
        week_start = first_monday + timedelta(weeks=week_num - 1)
        week_end = week_start + timedelta(days=7)
        
        # Convert to UTC
        start_utc = irl.localize(week_start).astimezone(utc)
        end_utc = irl.localize(week_end).astimezone(utc)
        
        match = {"timestamp": {"$gte": start_utc, "$lt": end_utc}}
        
        # Apply filters
        user = request.args.get('user')
        if user and user != 'ALL':
            match["user"] = user
        match = apply_device_room_filters(match)
        
        # Group by day and get summary stats
        pipeline = [
            {"$match": match},
            {
                "$addFields": {
                    "date": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$timestamp",
                            "timezone": "Europe/Dublin"
                        }
                    }
                }
            },
            {
                "$group": {
                    "_id": {
                        "date": "$date",
                        "user": "$user",
                        "device": "$device"
                    },
                    "actions": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.date",
                    "actions": {"$sum": "$actions"},
                    "users": {"$addToSet": "$_id.user"},
                    "devices": {"$addToSet": "$_id.device"}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        results = list(db.device_logs.aggregate(pipeline))
        
        # Build device lookup for friendly names
        all_devices = list(db.devices_collection.find({}))
        device_lookup = {}
        for d in all_devices:
            device_lookup[str(d["_id"])] = d.get("name", str(d["_id"]))
            if "entityId" in d:
                device_lookup[d["entityId"]] = d.get("name", d.get("entityId"))
        
        def get_friendly_name(device_id):
            return device_lookup.get(device_id, device_id)
        
        # Format results
        data = []
        for r in results:
            # Get top 3 users and devices for this day
            top_users = r.get("users", [])[:3]
            top_devices = [get_friendly_name(d) for d in r.get("devices", [])][:3]
            
            data.append({
                "date": r["_id"],
                "actions": r["actions"],
                "topUsers": [u for u in top_users if u],
                "topDevices": [d for d in top_devices if d]
            })
        
        return jsonify(data)
        
    except Exception as e:
        print(f"[week_breakdown] Error: {e}")
        return jsonify([])

# Month Breakdown - Get daily breakdown for a specific month
@analytics_routes.route('/month-breakdown/<month_id>', methods=['GET'])
def month_breakdown(month_id):
    """
    Get daily breakdown for a specific month.
    month_id format: "2025-07" (year-month)
    """
    try:
        # Parse month_id like "2025-07"
        year, month = map(int, month_id.split('-'))
        
        irl = timezone('Europe/Dublin')
        
        # Calculate start and end dates for the month
        month_start = irl.localize(datetime(year, month, 1))
        
        # Calculate last day of month
        if month == 12:
            next_month = irl.localize(datetime(year + 1, 1, 1))
        else:
            next_month = irl.localize(datetime(year, month + 1, 1))
        
        # Convert to UTC
        start_utc = month_start.astimezone(utc)
        end_utc = next_month.astimezone(utc)
        
        match = {"timestamp": {"$gte": start_utc, "$lt": end_utc}}
        
        # Apply filters
        user = request.args.get('user')
        if user and user != 'ALL':
            match["user"] = user
        match = apply_device_room_filters(match)
        
        # Group by day and get summary stats
        pipeline = [
            {"$match": match},
            {
                "$addFields": {
                    "date": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$timestamp",
                            "timezone": "Europe/Dublin"
                        }
                    }
                }
            },
            {
                "$group": {
                    "_id": {
                        "date": "$date",
                        "user": "$user",
                        "device": "$device"
                    },
                    "actions": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.date",
                    "actions": {"$sum": "$actions"},
                    "users": {"$addToSet": "$_id.user"},
                    "devices": {"$addToSet": "$_id.device"}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        results = list(db.device_logs.aggregate(pipeline))
        
        # Build device lookup for friendly names
        all_devices = list(db.devices_collection.find({}))
        device_lookup = {}
        for d in all_devices:
            device_lookup[str(d["_id"])] = d.get("name", str(d["_id"]))
            if "entityId" in d:
                device_lookup[d["entityId"]] = d.get("name", d.get("entityId"))
        
        def get_friendly_name(device_id):
            return device_lookup.get(device_id, device_id)
        
        # Format results
        data = []
        for r in results:
            # Get top 3 users and devices for this day
            top_users = r.get("users", [])[:3]
            top_devices = [get_friendly_name(d) for d in r.get("devices", [])][:3]
            
            data.append({
                "date": r["_id"],
                "actions": r["actions"],
                "topUsers": [u for u in top_users if u],
                "topDevices": [d for d in top_devices if d]
            })
        
        return jsonify(data)
        
    except Exception as e:
        print(f"[month_breakdown] Error: {e}")
        return jsonify([])

# Daily Breakdown - Get hourly breakdown for a specific day
@analytics_routes.route('/daily-breakdown/<date_str>', methods=['GET'])
def daily_breakdown(date_str):
    """
    Get hourly breakdown for a specific day.
    date_str format: "2025-07-14" (YYYY-MM-DD)
    """
    try:
        irl = timezone('Europe/Dublin')
        
        # Parse the date
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
        start_local = irl.localize(target_date.replace(hour=0, minute=0, second=0, microsecond=0))
        end_local = start_local + timedelta(days=1)
        
        # Convert to UTC
        start_utc = start_local.astimezone(utc)
        end_utc = end_local.astimezone(utc)
        
        match = {"timestamp": {"$gte": start_utc, "$lt": end_utc}}
        
        # Apply filters
        user = request.args.get('user')
        if user and user != 'ALL':
            match["user"] = user
        match = apply_device_room_filters(match)
        
        # Group by hour and get summary stats
        pipeline = [
            {"$match": match},
            {
                "$addFields": {
                    "hour": {"$hour": {"date": "$timestamp", "timezone": "Europe/Dublin"}}
                }
            },
            {
                "$group": {
                    "_id": {
                        "hour": "$hour",
                        "user": "$user",
                        "device": "$device"
                    },
                    "actions": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.hour",
                    "actions": {"$sum": "$actions"},
                    "users": {"$addToSet": "$_id.user"},
                    "devices": {"$addToSet": "$_id.device"}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        results = list(db.device_logs.aggregate(pipeline))
        
        # Build device lookup for friendly names
        all_devices = list(db.devices_collection.find({}))
        device_lookup = {}
        for d in all_devices:
            device_lookup[str(d["_id"])] = d.get("name", str(d["_id"]))
            if "entityId" in d:
                device_lookup[d["entityId"]] = d.get("name", d.get("entityId"))
        
        def get_friendly_name(device_id):
            return device_lookup.get(device_id, device_id)
        
        # Format results - ensure all 24 hours are represented
        hour_data = {}
        for r in results:
            hour = r["_id"]
            top_users = r.get("users", [])[:3]
            top_devices = [get_friendly_name(d) for d in r.get("devices", [])][:3]
            
            hour_data[hour] = {
                "hour": f"{hour:02d}:00",
                "actions": r["actions"],
                "topUsers": [u for u in top_users if u],
                "topDevices": [d for d in top_devices if d]
            }
        
        # Create full 24-hour data array
        data = []
        for hour in range(24):
            if hour in hour_data:
                data.append(hour_data[hour])
            else:
                data.append({
                    "hour": f"{hour:02d}:00",
                    "actions": 0,
                    "topUsers": [],
                    "topDevices": []
                })
        
        return jsonify(data)
        
    except Exception as e:
        print(f"[daily_breakdown] Error: {e}")
        return jsonify([])

# Usage Per Day - New endpoint for daily view with daily bars
@analytics_routes.route('/usage-per-day', methods=['GET'])
def usage_per_day():
    """
    Group usage data by day within the given date range.
    Returns daily periods with action counts.
    """
    start, end = get_date_range()
    if not start or not end:
        # Default to last 7 days if no range specified
        end = datetime.now(utc)
        start = end - timedelta(days=7)
    
    match = {"timestamp": {"$gte": start, "$lt": end}}
    
    # Apply user filter
    user = request.args.get('user')
    if user and user != 'ALL':
        match["user"] = user
    
    # Apply device/room filters
    match = apply_device_room_filters(match)
    
    pipeline = [
        {"$match": match},
        {
            "$addFields": {
                "date": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$timestamp",
                        "timezone": "Europe/Dublin"
                    }
                }
            }
        },
        {
            "$group": {
                "_id": "$date",
                "actions": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    results = list(db.device_logs.aggregate(pipeline))
    
    # Format the results
    data = []
    for r in results:
        # Convert date to more readable format
        try:
            date_obj = datetime.strptime(r["_id"], "%Y-%m-%d")
            day_label = date_obj.strftime("%m/%d")  # MM/DD format
        except:
            day_label = r["_id"]
        
        data.append({
            "period": day_label,
            "date": r["_id"],
            "actions": r["actions"]
        })
    
    return jsonify(data)

# Errors Per Device
@analytics_routes.route('/errors-per-device', methods=['GET'])
def errors_per_device():
    """Get error count by device with device names"""
    start, end = get_date_range()
    match = {"is_error": True}
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
        {"$group": {"_id": "$device", "errors": {"$sum": 1}, "error_types": {"$addToSet": "$error_type"}}},
        {"$sort": {"errors": -1}}
    ]
    
    results = list(db.device_logs.aggregate(pipeline))
    
    # Get device names
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
        data.append({
            "device": r["_id"], 
            "errors": r["errors"], 
            "name": name,
            "error_types": [et for et in r["error_types"] if et]  # Filter out None values
        })
    
    return jsonify(data)

# Errors Per User
@analytics_routes.route('/errors-per-user', methods=['GET'])
def errors_per_user():
    """Get error count by user"""
    start, end = get_date_range()
    match = {"is_error": True}
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
        {"$group": {"_id": "$user", "errors": {"$sum": 1}, "error_types": {"$addToSet": "$error_type"}}},
        {"$sort": {"errors": -1}}
    ]
    
    results = list(db.device_logs.aggregate(pipeline))
    data = [{"user": r["_id"], "errors": r["errors"], "error_types": [et for et in r["error_types"] if et]} for r in results]
    return jsonify(data)

# Error Types Distribution
@analytics_routes.route('/error-types', methods=['GET'])
def error_types():
    """Get distribution of error types"""
    start, end = get_date_range()
    match = {"is_error": True, "error_type": {"$exists": True, "$ne": None}}
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
        {"$group": {"_id": "$error_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    results = list(db.device_logs.aggregate(pipeline))
    data = [{"error_type": r["_id"], "count": r["count"]} for r in results]
    return jsonify(data)

# Recent Errors
@analytics_routes.route('/recent-errors', methods=['GET'])
def recent_errors():
    """Get recent error logs with device names"""
    start, end = get_date_range()
    q = {"is_error": True}
    if start and end:
        q["timestamp"] = {"$gte": start, "$lt": end}
    user = request.args.get('user')
    if user and user != 'ALL':
        q["user"] = user
    
    # Apply device/room filters
    q = apply_device_room_filters(q)
    
    logs = list(db.device_logs.find(q).sort("timestamp", -1).limit(10))
    
    # Get device names
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

    errors = []
    for log in logs:
        errors.append({
            "user": log.get("user", "unknown"),
            "action": log.get("action", ""),
            "device_name": get_friendly_name(log),
            "device": log.get("device", ""),
            "result": log.get("result", ""),
            "error_type": log.get("error_type", "unknown"),
            "timestamp": log.get("timestamp").isoformat() if log.get("timestamp") else "",
        })
    
    return jsonify(errors)

# Device Health Status
@analytics_routes.route('/device-health', methods=['GET'])
def device_health():
    """Get device health status based on error rates"""
    start, end = get_date_range()
    match = {}
    if start and end:
        match["timestamp"] = {"$gte": start, "$lt": end}
    user = request.args.get('user')
    if user and user != 'ALL':
        match["user"] = user
    
    # Apply device/room filters
    match = apply_device_room_filters(match)
    
    # Get total actions per device
    total_pipeline = []
    if match:
        total_pipeline.append({"$match": match})
    total_pipeline += [
        {"$group": {"_id": "$device", "total_actions": {"$sum": 1}}},
    ]
    
    # Get error actions per device
    error_match = {**match, "is_error": True}
    error_pipeline = []
    if error_match:
        error_pipeline.append({"$match": error_match})
    error_pipeline += [
        {"$group": {"_id": "$device", "error_actions": {"$sum": 1}}},
    ]
    
    total_results = list(db.device_logs.aggregate(total_pipeline))
    error_results = list(db.device_logs.aggregate(error_pipeline))
    
    # Create error map
    error_map = {r["_id"]: r["error_actions"] for r in error_results}
    
    # Get device names
    all_device_ids = [r["_id"] for r in total_results]
    object_ids = [ObjectId(d) for d in all_device_ids if ObjectId.is_valid(d)]
    entity_ids = [d for d in all_device_ids if not ObjectId.is_valid(d)]
    
    device_name_map = {}
    for d in db.devices_collection.find({"_id": {"$in": object_ids}}):
        device_name_map[str(d["_id"])] = d.get("name", str(d["_id"]))
    if entity_ids:
        for d in db.devices_collection.find({"entityId": {"$in": entity_ids}}):
            device_name_map[d.get("entityId")] = d.get("name", d.get("entityId"))
    
    health_data = []
    for r in total_results:
        device_id = r["_id"]
        total = r["total_actions"]
        errors = error_map.get(device_id, 0)
        error_rate = (errors / total) * 100 if total > 0 else 0
        
        # Determine health status
        if error_rate == 0:
            status = "healthy"
        elif error_rate < 5:
            status = "warning"
        else:
            status = "critical"
        
        health_data.append({
            "device": device_id,
            "name": device_name_map.get(device_id, device_id),
            "total_actions": total,
            "error_actions": errors,
            "error_rate": round(error_rate, 2),
            "status": status
        })
    
    # Sort by error rate descending
    health_data.sort(key=lambda x: x["error_rate"], reverse=True)
    
    return jsonify(health_data)

# Group Analysis - New endpoint for analyzing device groups
@analytics_routes.route('/group-analysis/<group_id>')
def get_group_analysis(group_id):
    """
    Analyze a device group to provide troubleshooting insights.
    Returns status and error information for all devices in the group.
    """
    try:
        start_utc, end_utc = get_date_range()
        
        # Build match query for the time range
        match_query = {}
        if start_utc and end_utc:
            match_query['timestamp'] = {'$gte': start_utc, '$lt': end_utc}
        
        # Apply device and room filters if provided
        apply_device_room_filters(match_query)
        
        # For special group IDs like "all_lights", we need to identify the devices
        if group_id == "all_lights":
            # Find all light devices
            devices_cursor = db.devices_collection.find({"type": {"$regex": "light", "$options": "i"}})
            group_devices = list(devices_cursor)
        elif group_id == "all_devices":
            # Find all devices
            devices_cursor = db.devices_collection.find({})
            group_devices = list(devices_cursor)
        else:
            # Try to find devices that belong to this group/room
            devices_cursor = db.devices_collection.find({
                "$or": [
                    {"room": group_id},
                    {"group": group_id},
                    {"_id": group_id} if len(group_id) == 24 else {}
                ]
            })
            group_devices = list(devices_cursor)
        
        group_analysis = {
            "group_id": group_id,
            "group_name": group_id.replace("_", " ").title(),
            "devices": [],
            "summary": {
                "total_devices": 0,
                "healthy_devices": 0,
                "error_devices": 0,
                "offline_devices": 0
            }
        }
        
        # Analyze each device in the group
        for device in group_devices:
            device_id = str(device.get('_id', ''))
            device_name = device.get('name', device_id)
            
            # Get error count for this device
            error_match = {**match_query, 'device': device_id, 'success': False}
            error_count = db.device_actions.count_documents(error_match)
            
            # Get total action count
            total_match = {**match_query, 'device': device_id}
            total_count = db.device_actions.count_documents(total_match)
            
            # Get most recent error
            recent_error = None
            if error_count > 0:
                error_cursor = db.device_actions.find(error_match).sort([('timestamp', -1)]).limit(1)
                recent_error_doc = list(error_cursor)
                if recent_error_doc:
                    recent_error = recent_error_doc[0].get('error_message', 'Unknown error')
            
            # Determine device status
            if total_count == 0:
                status = "offline"
                group_analysis["summary"]["offline_devices"] += 1
            elif error_count == 0:
                status = "healthy"
                group_analysis["summary"]["healthy_devices"] += 1
            elif error_count / total_count > 0.1:  # More than 10% errors
                status = "critical"
                group_analysis["summary"]["error_devices"] += 1
            else:
                status = "warning"
                group_analysis["summary"]["error_devices"] += 1
            
            group_analysis["devices"].append({
                "device_id": device_id,
                "name": device_name,
                "status": status,
                "total_actions": total_count,
                "error_count": error_count,
                "error_rate": round((error_count / max(total_count, 1)) * 100, 2),
                "last_error": recent_error,
                "room": device.get('room', 'Unknown')
            })
        
        group_analysis["summary"]["total_devices"] = len(group_devices)
        
        # Sort devices by error rate (highest first)
        group_analysis["devices"].sort(key=lambda x: x["error_rate"], reverse=True)
        
        return jsonify(group_analysis)
        
    except Exception as e:
        print(f"[get_group_analysis] Error: {e}")
        return jsonify({"error": "Failed to analyze device group", "details": str(e)}), 500
