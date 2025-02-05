from flask import Blueprint, jsonify, request
from bson import ObjectId
from db import automations_collection, devices_collection

automation_routes = Blueprint('automations', __name__)
