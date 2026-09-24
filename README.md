# Online Complaint Management System

Users submit complaints, agents pick them up and chat with the user in real time, and admins manage accounts and see analytics.

- **backend/** – Express, MongoDB (Mongoose), Socket.io
- **frontend/** – React, Vite, React Router, Recharts

## Running locally

Requires Node 18+ and MongoDB. With Docker, MongoDB is one command:

```bash
docker run -d --name ors-mongo -p 27017:27017 mongo:7
```

**Backend**

```bash
cd backend
cp .env.example .env   # then fill in JWT_SECRET and the two signup codes
npm install
npm run dev
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

The frontend calls the API at `http://<current host>:5000` by default. On macOS, port 5000 is taken by AirPlay Receiver, so run the backend on another port (`PORT=5050` in `backend/.env`) and point the frontend at it with `VITE_API_URL=http://localhost:5050` in `frontend/.env.local`. Add the frontend's URL to `CLIENT_ORIGIN` in `backend/.env`.

## Roles

| Role  | How to get it | Can |
| ----- | ------------- | --- |
| User  | Register normally | Submit complaints, chat, leave feedback once resolved |
| Agent | Register with `AGENT_SIGNUP_CODE` | Take complaints from the pool, update status, chat |
| Admin | Register with `ADMIN_SIGNUP_CODE` (max `MAX_ADMIN_ACCOUNTS`) | Manage users and agents, assign complaints, view analytics |
