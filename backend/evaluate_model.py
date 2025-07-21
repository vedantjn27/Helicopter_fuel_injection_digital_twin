# evaluate_model.py

import pandas as pd
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.ensemble import IsolationForest
from joblib import load
from pymongo import MongoClient
import os

# Load MongoDB URI

MONGO_URI = "mongodb://localhost:27017"

# Connect to MongoDB
client = MongoClient(MONGO_URI)
collection = client["helicopter_db"]["telemetry_logs"]

# Load latest records
data = list(collection.find({}, {"_id": 0, "rpm": 1, "fuel_pressure": 1, "fuel_temp": 1, "flow_rate": 1, "label": 1}))

# Convert to DataFrame
df = pd.DataFrame(data)

# Make sure required columns exist
required_columns = ["rpm", "fuel_pressure", "fuel_temp", "flow_rate"]
if not all(col in df.columns for col in required_columns):
    raise ValueError("Required fields missing from data!")

# Check if manual labels exist
has_labels = "label" in df.columns

# Load trained model
model = load("anomaly_model.joblib")

# Run predictions
X = df[required_columns]
y_pred = model.predict(X)
y_pred = [1 if x == -1 else 0 for x in y_pred]  # 1 = anomaly, 0 = normal

if has_labels:
    y_true = df["label"]
    print("\n Supervised Evaluation (Manual Labels Present)")
    print("Accuracy:", accuracy_score(y_true, y_pred))
    print("Confusion Matrix:\n", confusion_matrix(y_true, y_pred))
    print("Classification Report:\n", classification_report(y_true, y_pred))
else:
    print("\n Unsupervised Evaluation (No Labels)")
    print(f"Total samples: {len(df)}")
    print(f"Predicted anomalies: {sum(y_pred)}")
