README: Digital Twin of Helicopter Fuel Injection System
Overview
A real-time digital twin that simulates helicopter fuel injection behavior, streams telemetry data over MQTT, detects anomalies using machine learning, and uses Gen AI to provide fault diagnostics and explanations.

Developed for a Hackathon | Powered by FastAPI, React.js, MQTT, MongoDB, and IBM Watsonx
Features
- Fuel System Simulation – RPM, Throttle %, Fuel Pressure, Temperature, Flow Rate
- MQTT Streaming – Real-time telemetry publishing to broker
- React Dashboard – Live charts, gauges, alerts
- ML-based Anomaly Detection – Isolation Forest model
- Fault Injection Engine – Simulate issues like injector clog, overheating
- Gen AI Reasoning (Optional) – Probable cause explanation using IBM Watsonx + RAG
Tech Stack
Backend: FastAPI (Python)
Frontend: React.js + Vite
Messaging: MQTT (HiveMQ)
Database: MongoDB
ML Model: Isolation Forest
Gen AI: IBM Watsonx (Granite + RAG) *(Optional)*
Getting Started
Clone the Repository:
git clone https://github.com//helicopter-digital-twin.git
cd helicopter-digital-twin

Start Backend:
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

Start Frontend:
cd frontend
npm install
npm run dev
API Endpoints
/telemetry (GET) - Returns a simulated telemetry sample
/telemetry/history (GET) - Fetches recent telemetry logs
/predict (POST) - Detects anomaly and gives probable cause
/simulate-fault (POST) - Injects a fault into simulation
Project Structure
helicopter-digital-twin/
├── backend/
│   ├── main.py
│   ├── utils.py
│   ├── anomaly_model.joblib
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   └── index.html
├── model_training/
│   └── train_model.ipynb
└── README.md
Potential Impact
- Reduces helicopter downtime with early fault detection
- Improves technician understanding with natural language diagnostics
- Enables safe virtual testing via fault injection
- Lays the groundwork for intelligent self-monitoring systems
Developed By
Vedant Jain
Powered by Gen AI – IBM Watsonx
Built as a Hackathon Project
License
MIT License – for academic and demo use only. Attribution required.
