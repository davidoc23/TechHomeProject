from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from db import automations_collection, devices_collection
from bson import ObjectId
import requests
from config import HOME_ASSISTANT_URL, HOME_ASSISTANT_TOKEN

scheduler = BackgroundScheduler()

def execute_automation(automation):
    try:
        action = automation.get('action', {})
        command = action.get('command', 'toggle').lower()
        device_id = action.get('deviceId')

        if not device_id:
            print(f"No deviceId found in automation '{automation.get('name')}'")
            return

        if isinstance(device_id, str):
            try:
                device_id = ObjectId(device_id)
            except Exception:
                print(f"Invalid ObjectId: {device_id}")
                return

        device = devices_collection.find_one({"_id": device_id})
        if not device:
            print(f"Device not found for automation '{automation.get('name')}'")
            return

        current_state = device.get('isOn', False)

        # Determine new state
        if command == 'turn_on':
            new_state = True
        elif command == 'turn_off':
            new_state = False
        elif command == 'toggle':
            new_state = not current_state
        else:
            print(f"Unsupported command '{command}' in automation '{automation.get('name')}'")
            return

        # Control Home Assistant device
        if device.get('isHomeAssistant'):
            ha_payload = {"entity_id": device["entityId"]}
            ha_headers = {
                "Authorization": f"Bearer {HOME_ASSISTANT_TOKEN}",
                "Content-Type": "application/json"
            }
            ha_service = "turn_on" if new_state else "turn_off"
            ha_url = f"{HOME_ASSISTANT_URL}/api/services/light/{ha_service}"
            ha_response = requests.post(ha_url, json=ha_payload, headers=ha_headers)

            if ha_response.status_code != 200:
                print(f"Failed Home Assistant command: {ha_response.text}")
            else:
                print(f"Home Assistant device {device['entityId']} set to {ha_service}")
        else:
            print(f"Local device '{device['name']}' set to {'ON' if new_state else 'OFF'}")

        # Update MongoDB state
        devices_collection.update_one(
            {"_id": device_id},
            {"$set": {"isOn": new_state}}
        )

        print(f"Automation '{automation['name']}' executed at {datetime.now()}")

    except Exception as e:
        print(f"Error executing automation: {e}")

def schedule_automations():
    scheduler.remove_all_jobs()
    automations = list(automations_collection.find({"enabled": True}))
    for automation in automations:
        cond = automation.get('condition', {})
        time_str = cond.get('time') or cond.get('value')  # support both formats
        if time_str:
            hour, minute = map(int, time_str.split(":"))
            job_id = str(automation['_id'])

            scheduler.add_job(
                execute_automation,
                trigger='cron',
                id=job_id,
                hour=hour,
                minute=minute,
                args=[automation],
                replace_existing=True
            )

def start_scheduler():
    scheduler.start()
