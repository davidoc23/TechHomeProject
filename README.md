# TechHome – Smart Home Management System

TechHome is a full-stack smart home management system that allows users to control smart devices through a mobile app, voice assistant, and intelligent automation. It features device control, room management, automation rules, AI-based usage suggestions, and secure user authentication — all built with modular, scalable architecture.

---

## Features

- **React Native App**  
  - Cross-platform mobile UI
  - Tab-based navigation between Home, Devices, Automation, Settings
  - Device control with toggles and sliders
  - Room grouping and management
  - Voice command interface and AI suggestion integration

- **Secure Authentication**  
  - JWT-based login/register system  
  - Password hashing with bcrypt  
  - Token refresh mechanism  

- **Backend (Flask)**  
  - RESTful API built with Flask  
  - Modular route structure using Blueprints  
  - MongoDB Atlas integration  
  - Home Assistant integration via API  
  - Machine learning prediction API using `scikit-learn`

- **Automation Engine**  
  - Time-based and condition-based triggers  
  - Rule creation, editing, and execution via backend scheduler

- **Machine Learning Suggestions**  
  - Device usage predictions based on time/day patterns  
  - Feedback loop to improve model accuracy over time

- **Voice Assistant (Leon)**  
  - Integrated open-source voice assistant (Leon)  
  - Typed or spoken commands  
  - Backend integration with Leon's intent parser

- **Raspberry Pi Hub**  
  - Runs Home Assistant as the core local controller  
  - Receives HTTP commands from the Flask backend  
  - Sends actions to real or simulated smart devices over the local network  
  - Acts as a bridge between cloud services and local automation

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React Native (Expo), Context API, Custom Hooks |
| Backend  | Flask, Flask-JWT-Extended, PyMongo, scikit-learn |
| Database | MongoDB Atlas |
| Voice    | Leon (Self-hosted) |
| Hardware | Raspberry Pi (HTTP relay to smart devices) |
| Integration | Home Assistant (REST API) |

---

## Project Structure

```
TechHome/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── db.py
│   ├── ml_models.py
│   ├── routes/
│   ├── tests/
│   └── requirements.txt
├── TechHome/ (React Native App)
│   ├── App.js
│   ├── components/
│   ├── screens/
│   ├── context/
│   ├── hooks/
│   └── theme/
```

---

## Setup Instructions

### Frontend (React Native App)

```bash
cd TechHome
npm install
npx expo start
```

Requires Expo Go (for mobile testing) or emulator.

---

### Backend (Flask API)

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # or source venv/bin/activate mac
pip install -r requirements.txt
python app.py
```

Make sure to configure your `.env` or `config.py` with:
- MongoDB URI
- JWT secret key
- Home Assistant token and URL

---

### Running Tests

Navigate to the `backend/` folder, make sure venv is active.

Ensure `pytest` is installed:

```bash
pip install pytest
```

Then run: 
```bash
pytest tests/
```

Includes:
- `test_auth_routes.py` – Login and registration

- `test_automation_routes.py` – Automation route testing

- `test_device_routes.py` – Device route testing

- `test_home_assistant_routes.py` – Home Assistant integration testing

- `test_integration_flow.py` – Full integration flow testing

- `test_ml_routes.py` – Machine learning route testing

- `test_room_routes.py` – Room and zone route testing

---

### Voice Assistant (Leon)

- Install Leon: [https://github.com/leon-ai/leon](https://github.com/leon-ai/leon)
- Run on Linux/VM environment (if not working on Windows)
- Create custom commands to send HTTP requests to backend

---

### Raspberry Pi (Optional)

- Python or Node service listening for HTTP commands
- Receives requests from backend and relays them to smart devices
- Runs [Home Assistant](https://www.home-assistant.io/) as the local automation engine  

---

## API Overview

Example endpoints:
- `POST /auth/login`
- `GET /devices`
- `POST /devices/:id/toggle`
- `POST /automations`
- `GET /suggestions`
- `GET /home-assistant/states`

---

## License & Acknowledgements

- Project developed as part of an academic dissertation  
- Voice control powered by [Leon](https://github.com/leon-ai/leon)  
- Local automation powered by [Home Assistant](https://www.home-assistant.io/)  
- Built with open-source technologies including Flask, React Native, MongoDB, and scikit-learn  

---


