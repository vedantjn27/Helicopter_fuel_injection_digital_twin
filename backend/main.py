from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random
import time
import json
import threading
import paho.mqtt.client as mqtt
from pymongo import MongoClient
from fastapi.encoders import jsonable_encoder
from datetime import datetime,timezone
import os
from typing import List
from bson import ObjectId
from bson.json_util import dumps
from sklearn.ensemble import IsolationForest
from joblib import dump, load
import pandas as pd
import numpy as np 
from fastapi import Query
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from twilio.rest import Client as TwilioClient
from dotenv import load_dotenv
from pydantic import BaseModel
import numpy as np
from fastapi.responses import StreamingResponse, JSONResponse
from io import StringIO
from datetime import timedelta
from collections import Counter


# MongoDB setup
MONGO_URI = "mongodb://localhost:27017"
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["helicopter_db"]
collection = db["telemetry_logs"]
collection_tanks = db["fuel_tanks"]

# Load .env
load_dotenv()

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_SENDER = os.getenv("SENDGRID_SENDER")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
ALERT_RECEIVER_PHONE = os.getenv("ALERT_RECEIVER_PHONE")
ALERT_RECEIVER_EMAIL = os.getenv("ALERT_RECEIVER_EMAIL")


# FastAPI app setup
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MQTT Broker setup
BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC = "helicopter/fuel"
mqtt_client = mqtt.Client()

fault_to_maintenance = {
    "Fuel pressure drop detected": "🔧 Inspect and replace fuel filters and pressure regulators.",
    "Fuel temperature anomaly": "🛠️ Check fuel cooling systems and thermal insulation.",
    "Flow rate fluctuation": "🛠️ Inspect injectors and clean fuel lines.",
    "RPM instability": "🔧 Examine engine control unit and throttle sensors.",
    "Normal operation": "✅ Routine maintenance recommended as per schedule."
}
class TankStatusUpdate(BaseModel):
    tank_id: str
    status: str  # Should be: Active, Inactive, or Under Maintenance

class FaultRequest(BaseModel):
    type: str

def convert_numpy_to_python(obj):
    for key, value in obj.items():
        if isinstance(value, (np.generic,)):
            obj[key] = value.item()
        elif isinstance(value, dict):
            obj[key] = convert_numpy_to_python(value)
    return obj

def simulate_fuel_system():
    rpm = random.randint(1500, 4000)
    throttle = round((rpm - 1500) / 25, 2)
    fuel_pressure = round(2.5 + (rpm / 1000) + random.uniform(-0.2, 0.2), 2)
    # Normal temperature calculation
    fuel_temp = round(20 + (rpm / 200) + random.uniform(-1, 1), 2)

    # Occasionally introduce anomaly (5% chance)
    if random.random() < 0.1:  # 10% probability
        if random.choice(["low", "high"]) == "low":
            fuel_temp = round(random.uniform(-40, -20), 2)  # Abnormally low temp
        else:
            fuel_temp = round(random.uniform(56, 80), 2)    # Abnormally high temp
    flow_rate = round(0.1 * throttle + random.uniform(0, 1), 2)
    return {
        "timestamp": datetime.utcnow(),
        "rpm": rpm,
        "throttle": throttle,
        "fuel_pressure": fuel_pressure,
        "fuel_temp": fuel_temp,
        "flow_rate": flow_rate
    }

def train_anomaly_model():
    data = list(collection.find({}, {"_id": 0, "rpm": 1, "fuel_pressure": 1, "fuel_temp": 1, "flow_rate": 1}))
    if len(data) < 20:
        print(" Not enough data to train model. Insert at least 20 telemetry records.")
        return
    df = pd.DataFrame(data)
    model = IsolationForest(n_estimators=100, contamination=0.05)
    model.fit(df)
    dump(model, "anomaly_model.joblib")
    print(" Model trained and saved.")

# Uncomment this line to train when needed
#train_anomaly_model()

try:
    model = load("anomaly_model.joblib")
    print(" Anomaly detection model loaded.")
except:
    model = None
    print(" Model not found. Train first using train_anomaly_model().")

def inject_fault(telemetry: dict, fault_type: str) -> dict:
    if fault_type == "injector_clog":
        telemetry["flow_rate"] *= 0.3  # Reduced flow
    elif fault_type == "sensor_failure":
        telemetry["fuel_temp"] = 999  # Unreasonably high
    elif fault_type == "fuel_leak":
        telemetry["fuel_pressure"] -= 2  # Pressure drop
    elif fault_type == "rpm_surge":
        telemetry["rpm"] += 2000  # Abnormal RPM
        telemetry["throttle"] = round((telemetry["rpm"] - 1500) / 25, 2)
    elif fault_type == "throttle_spike":
        telemetry["throttle"] = 100
        telemetry["flow_rate"] = round(10 + random.uniform(0, 2), 2)
    # Add more faults as needed
    else:
        telemetry["note"] = " Unknown fault type  no effect"
    return telemetry

def infer_probable_cause(telemetry: dict) -> str:
    rpm = telemetry["rpm"]
    fuel_pressure = telemetry["fuel_pressure"]
    fuel_temp = telemetry["fuel_temp"]
    flow_rate = telemetry["flow_rate"]

    if flow_rate < 2 and fuel_pressure > 4:
        return "Fuel injector clog (low flow rate)"
    elif fuel_temp > 56:
        return "Overheating sensor or coolant failure"
    elif fuel_temp < -20:
        return " sensor breakdown or coolant failure"
    elif fuel_pressure < 2:
        return "Possible fuel leak or pump failure"
    elif fuel_pressure > 4:
        return "Possible fuel leak or pump failure"
    elif rpm > 5000:
        return "Abnormal RPM surge  throttle malfunction"
    elif throttle := telemetry.get("throttle", 0) > 90 and flow_rate > 8:
        return "Throttle stuck open  excessive fuel injection"
    else:
        return "Anomaly detected, cause unknown"

def infer_safety_measures(cause):
    recommendations = {
        "Fuel pressure abnormal likely injector clog":
            "⚠️ Reduce throttle immediately. Prepare for possible engine power loss. Return to base if feasible.",

        "Fuel temperature high possible overheating":
            "🔥 Monitor engine temperature. Avoid sudden throttle increases. Prepare for emergency landing if required.",

        "Fuel flow rate inconsistent potential leak or blockage":
            "🚨 Monitor fuel usage carefully. Avoid aggressive maneuvers. Notify control and prepare for early landing.",

        "Normal operation":
            "✅ No safety action required. System operating within safe parameters."
    }
    return recommendations.get(cause, "⚠️ Follow standard emergency procedures. Refer to flight manual.")


def estimate_rul(anomaly_timestamps, observation_window_days=30):
    """
    Estimate RUL in days based on anomaly frequency and trends.
    More anomalies = shorter RUL.
    """
    if not anomaly_timestamps:
        return "🚀 Component operating normally. No critical failure predicted."

    total_anomalies = len(anomaly_timestamps)
    
    # Days since first anomaly in observation window
    days_covered = max(1, (anomaly_timestamps[-1] - anomaly_timestamps[0]).days)

    avg_days_between_anomalies = days_covered / total_anomalies

    # Heuristic RUL estimation
    estimated_rul = int(avg_days_between_anomalies * 2)  # Multiplier can be tuned

    return estimated_rul


# MQTT Publisher Thread with anomaly detection
def mqtt_publish_loop():
    mqtt_client.connect(BROKER, PORT)
    print(f" Connected to MQTT Broker at {BROKER}")
    
    while True:
        telemetry = simulate_fuel_system()

        # Add UTC timestamp
        telemetry["timestamp"] = datetime.now(timezone.utc)

        # 🧠 Anomaly prediction if model is loaded
        if model:
            features = [[
                telemetry["rpm"],
                telemetry["fuel_pressure"],
                telemetry["fuel_temp"],
                telemetry["flow_rate"]
            ]]
            pred = model.predict(features)[0]
            score = model.decision_function(features)[0]

            telemetry["anomaly"] = bool(pred == -1)
            telemetry["score"] = float(score)

            # 🛑 Add cause only if anomaly detected
            if telemetry["anomaly"]:
                telemetry["probable_cause"] = infer_probable_cause(telemetry)
        else:
            telemetry["anomaly"] = None
            telemetry["score"] = None

        # 📡 MQTT payload (cleaned for external systems)
        payload = json.dumps({
            "rpm": telemetry["rpm"],
            "throttle": telemetry["throttle"],
            "fuel_pressure": telemetry["fuel_pressure"],
            "fuel_temp": telemetry["fuel_temp"],
            "flow_rate": telemetry["flow_rate"]
        })

        mqtt_client.publish(TOPIC, payload)

        # 💾 Store full record in MongoDB
        collection.insert_one(jsonable_encoder(telemetry))

        print(" Published to MQTT and stored in MongoDB:", telemetry)
        time.sleep(10)


# Start MQTT publishing in background
@app.on_event("startup")
def start_background_mqtt():
    threading.Thread(target=mqtt_publish_loop, daemon=True).start()

# FastAPI endpoint
@app.get("/telemetry")
def get_telemetry():
    data = simulate_fuel_system()
    result = collection.insert_one(jsonable_encoder(data))
    print(" Inserted via API - ID:", result.inserted_id)
    # Convert timestamp for JSON response
    data["timestamp"] = data["timestamp"].isoformat()
    return data

@app.get("/telemetry/history")
def get_telemetry_history(limit: int = 20):
    """
    Get the latest `limit` telemetry logs from MongoDB.
    Default: 20 most recent entries.
    """
    # Sort by newest and limit
    logs = list(collection.find().sort("timestamp", -1).limit(limit))

    # Convert Mongo ObjectId and datetime to serializable format
    for log in logs:
        log["_id"] = str(log["_id"])
        if "timestamp" in log and isinstance(log["timestamp"], datetime):
            log["timestamp"] = log["timestamp"].isoformat()
    return logs

@app.post("/initialize-tanks")
def initialize_tanks():
    tanks = [
        {"tank_id": "TANK-1", "status": "Active"},
        {"tank_id": "TANK-2", "status": "Active"},
        {"tank_id": "TANK-3", "status": "Active"},
    ]
    collection_tanks.delete_many({})  # Clear previous tanks (optional)
    collection_tanks.insert_many(tanks)
    return {"message": "✅ 3 fuel tanks initialized successfully."}

@app.get("/tanks")
def get_all_tanks():
    tanks = list(collection_tanks.find({}, {"_id": 0}))
    return {"fuel_tanks": tanks}

@app.post("/tanks/update-status")
def update_tank_status(update: TankStatusUpdate):
    if update.status not in ["Active", "Inactive", "Under Maintenance"]:
        return {"error": "❌ Invalid status. Use Active, Inactive, or Under Maintenance."}

    result = collection_tanks.update_one(
        {"tank_id": update.tank_id},
        {"$set": {"status": update.status}}
    )

    if result.matched_count == 0:
        return {"error": f"❌ Tank {update.tank_id} not found."}

    return {"message": f"✅ {update.tank_id} status updated to {update.status}."}

@app.post("/predict")
def predict_anomaly():
    if not model:
        return {"error": "Anomaly detection model not found. Train it first."}

    telemetry = simulate_fuel_system()
    telemetry["timestamp"] = datetime.utcnow()

    features = [[
        telemetry["rpm"],
        telemetry["fuel_pressure"],
        telemetry["fuel_temp"],
        telemetry["flow_rate"],
    ]]

    # ✅ Ensure native Python types
    pred = model.predict(features)[0]
    score = model.decision_function(features)[0]
    telemetry["anomaly"] = bool(pred == -1)          # <-- Fix numpy.bool_
    telemetry["score"] = float(score)                 # <-- Fix numpy.float64

    # ✅ Add probable cause only if anomaly
    if telemetry["anomaly"]:
        telemetry["probable_cause"] = infer_probable_cause(telemetry)

    # ✅ Convert remaining numpy values (if any)
    telemetry = convert_numpy_to_python(telemetry)

    print("Telemetry to be inserted into DB:", telemetry)


    # ✅ Insert into MongoDB
    collection.insert_one(jsonable_encoder(telemetry))

    # ✅ Format timestamp for return
    telemetry["timestamp"] = telemetry["timestamp"].isoformat()

    return {
        "anomaly": telemetry["anomaly"],
        "score": round(telemetry["score"], 4),
        **({"probable_cause": telemetry["probable_cause"]} if telemetry["anomaly"] else {}),
        "telemetry": telemetry
    }

@app.post("/safety-recommendation")
def safety_recommendation():
    if not model:
        return {"error": "Anomaly detection model not available. Train it first."}

    telemetry = simulate_fuel_system()
    telemetry["timestamp"] = datetime.utcnow()

    features = [[
        telemetry["rpm"],
        telemetry["fuel_pressure"],
        telemetry["fuel_temp"],
        telemetry["flow_rate"]
    ]]

    pred = model.predict(features)[0]
    score = model.decision_function(features)[0]

    telemetry["anomaly"] = bool(pred == -1)
    telemetry["score"] = float(score)

    if telemetry["anomaly"]:
        cause = infer_probable_cause(telemetry)
        safety = infer_safety_measures(cause)
    else:
        cause = "Normal operation"
        safety = "✅ No safety action required."

    # Optional: log this result
    telemetry["probable_cause"] = cause
    telemetry["safety_measures"] = safety
    collection.insert_one(jsonable_encoder(telemetry))

    return {
        "anomaly_detected": telemetry["anomaly"],
        "probable_cause": cause,
        "safety_measures": safety,
        "telemetry": telemetry
    }

@app.get("/maintenance-suggestions")
def maintenance_suggestions():
    # Fetch last 100 anomaly logs (customizable)
    logs = collection.find({"anomaly": True}).sort("timestamp", -1).limit(100)
    
    causes = [log.get("probable_cause", "Unknown") for log in logs]
    cause_counter = Counter(causes)
    
    if not causes:
        return {
            "message": "✅ No recent anomalies detected. Routine maintenance recommended."
        }
    
    # Prepare suggestions
    suggestions = []
    for cause, count in cause_counter.most_common():
        suggestion = fault_to_maintenance.get(cause, "⚙️ General system inspection advised.")
        suggestions.append({
            "probable_cause": cause,
            "occurrences": count,
            "recommended_action": suggestion
        })
    
    return {
        "maintenance_suggestions": suggestions,
        "total_anomalies_analyzed": sum(cause_counter.values())
    }

@app.get("/predictive-maintenance")
def predictive_maintenance_estimator():
    # Fetch recent 100 anomalies (or any count you prefer)
    logs = collection.find({"anomaly": True}).sort("timestamp", 1).limit(100)

    anomaly_timestamps = []
    for log in logs:
        ts = log.get("timestamp")
        if ts:
            anomaly_timestamps.append(ts)

    if not anomaly_timestamps:
        rul = "🚀 Component operating normally. No critical failure predicted."
    else:
        # Convert MongoDB timestamps to datetime objects
        anomaly_timestamps = [ts if isinstance(ts, datetime) else datetime.fromisoformat(ts) for ts in anomaly_timestamps]
        rul = estimate_rul(anomaly_timestamps)

    return {
        "remaining_useful_life_days_estimated": rul,
        "total_anomalies_analyzed": len(anomaly_timestamps)
    }



@app.get("/alerts")
def get_anomaly_alerts(limit: int = Query(10, description="Number of recent anomalies to return")):
    """
    Returns the latest `limit` anomaly records where anomaly == True.
    Useful for alerting or dashboard display.
    """
    # Fetch only anomaly==True records, sorted by latest timestamp
    anomalies = list(collection.find(
        {"anomaly": True}
    ).sort("timestamp", -1).limit(limit))

    # Convert ObjectId and timestamp to string for JSON serialization
    for doc in anomalies:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("timestamp"), datetime):
            doc["timestamp"] = doc["timestamp"].isoformat()

    return {
        "count": len(anomalies),
        "alerts": anomalies
    }

@app.post("/retrain")
def retrain_model():
    train_anomaly_model()
    return {"message": "Model retrained and saved."}

@app.post("/alert/send")
def send_latest_alert():
    # Fetch latest anomaly
    latest = collection.find_one({"anomaly": True}, sort=[("timestamp", -1)])
    if not latest:
        return {"message": "No anomaly found in the database."}

    # Format message
    timestamp = latest["timestamp"].isoformat() if isinstance(latest["timestamp"], datetime) else latest["timestamp"]
    message_body = (
        f" Anomaly Detected!\n"
        f"RPM: {latest['rpm']}, Throttle: {latest['throttle']}%\n"
        f"Fuel Pressure: {latest['fuel_pressure']} Bar\n"
        f"Fuel Temp: {latest['fuel_temp']} °C\n"
        f"Flow Rate: {latest['flow_rate']} L/min\n"
        f"Score: {round(latest['score'], 4)}\n"
        f"Time: {timestamp}"
    )

    # ✅ Send Email via SendGrid
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        email = Mail(
            from_email=SENDGRID_SENDER,
            to_emails=ALERT_RECEIVER_EMAIL,
            subject=" Helicopter Fuel Anomaly Detected",
            plain_text_content=message_body
        )
        sg.send(email)
        print(" Email sent.")
    except Exception as e:
        print(" Email failed:", str(e))

    # ✅ Send SMS via Twilio
    try:
        twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        twilio_client.messages.create(
            body=message_body,
            from_=TWILIO_PHONE_NUMBER,
            to=ALERT_RECEIVER_PHONE
        )
        print(" SMS sent.")
    except Exception as e:
        print(" SMS failed:", str(e))

    return {
        "message": "Alert sent via email and SMS.",
        "alert_data": message_body
    }

@app.post("/simulate-fault")
def simulate_fault(fault: FaultRequest):
    telemetry = simulate_fuel_system()

    # Inject fault (your logic assumed)
    telemetry = inject_fault(telemetry, fault.type)
    telemetry["fault_type"] = fault.type
    telemetry["timestamp"] = datetime.utcnow()

    # Run anomaly detection
    if model:
        features = [[
            telemetry["rpm"],
            telemetry["fuel_pressure"],
            telemetry["fuel_temp"],
            telemetry["flow_rate"]
        ]]
        pred = model.predict(features)[0]
        score = model.decision_function(features)[0]
        telemetry["anomaly"] = bool(pred == -1)  # ✅ convert np.bool_ to native bool
        telemetry["score"] = float(score)        # ✅ convert np.float64 to native float

    # ✅ Convert remaining numpy values
    telemetry = convert_numpy_to_python(telemetry)

    # ✅ Store in MongoDB
    collection.insert_one(jsonable_encoder(telemetry))

    return {
        "fault_type": fault.type,
        "anomaly": telemetry.get("anomaly"),
        "score": round(telemetry.get("score", 0), 4),
        "telemetry": telemetry
    }

@app.get("/telemetry/export")
def export_anomalies(
    format: str = Query("csv", description="Export format: csv or json"),
    start_date: str = Query(None, description="Start date in YYYY-MM-DD"),
    end_date: str = Query(None, description="End date in YYYY-MM-DD")
):
    """
    Export anomalous telemetry data as CSV or JSON.
    Optional date filtering: ?start_date=2025-07-01&end_date=2025-07-02
    """
    query = {"anomaly": True}

    # Parse and apply date filters
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query["timestamp"] = {"$gte": start_dt}
        except ValueError:
            return JSONResponse(status_code=400, content={"error": "Invalid start_date format. Use YYYY-MM-DD"})

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")+ timedelta(days=1)
            # Add to existing or create timestamp filter
            query.setdefault("timestamp", {})
            query["timestamp"]["$lte"] = end_dt
        except ValueError:
            return JSONResponse(status_code=400, content={"error": "Invalid end_date format. Use YYYY-MM-DD"})

    # Fetch from MongoDB
    anomaly_logs = list(collection.find(query, {"_id": 0}))

    if not anomaly_logs:
        return JSONResponse(status_code=404, content={"message": "No anomalies found in the specified date range."})

    df = pd.DataFrame(anomaly_logs)

    if format == "json":
        return JSONResponse(content=df.to_dict(orient="records"))

    elif format == "csv":
        csv_stream = StringIO()
        df.to_csv(csv_stream, index=False)
        csv_stream.seek(0)
        return StreamingResponse(
            csv_stream,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=anomalies.csv"}
        )

    return JSONResponse(status_code=400, content={"error": "Unsupported format. Use 'csv' or 'json'."})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
