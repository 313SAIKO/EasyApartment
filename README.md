

# 🏢 EasyProperty

Property Management System (PMS)  
Built with **NestJS (Backend)** + **Next.js (Frontend)** + **MongoDB**

---

# 📦 Project Structure

```
EasyProperty/
 ├── backend/   # NestJS API
 ├── frontend/  # Next.js App (App Router)
 ├── .gitignore
 └── README.md
```

---

# 🚀 Tech Stack

- Backend: NestJS + Mongoose
- Frontend: Next.js 16 (App Router) + TypeScript + Tailwind
- Database: MongoDB (Atlas recommended)
- Auth: JWT

---

# 🖥️ Requirements

Please install the following before starting:

- Node.js **22 LTS or newer** (the backend imports the ESM-only `uuid@13`)
- npm (comes with Node)
- MongoDB Atlas account (or local MongoDB)

Check your version:

```
node -v
npm -v
```

---

# 📥 1️⃣ Clone Repository

```
git clone <YOUR_REPO_URL>
cd EasyProperty
```

---

# ⚙️ 2️⃣ Backend Setup (NestJS)

Go to backend folder:

```
cd backend
```

Install dependencies:

```
npm install
```

Copy the example env file and fill in the values (see [Environment Variables Summary](#-environment-variables-summary)):

```
cp .env.example .env
```

Run backend:

```
npm run start:dev
```

Backend will run on:

```
http://localhost:3000
```

---

# 🌐 3️⃣ Frontend Setup (Next.js)

Open new terminal:

```
cd frontend
```

Install dependencies:

```
npm install
```

Copy the example env file (the default value points at the local backend):

```
cp .env.example .env
```

Run frontend:

```
npm run dev
```

Frontend will run on:

```
http://localhost:3001
```

The dev script pins the frontend to port 3001 so it doesn't clash with the backend on 3000. The backend's CORS setting only allows `http://localhost:3001`.

---

# 🔐 Environment Variables Summary

## backend/.env

| Variable | Required | Description |
|---|---|---|
| `PORT` | no | API port, default `3000` |
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_ACCESS_SECRET` | yes | Secret for access tokens |
| `JWT_REFRESH_SECRET` | yes | Secret for refresh tokens (must differ from the access secret) |
| `JWT_ACCESS_EXPIRATION` | no | Access token lifetime in seconds, default `900` |
| `JWT_REFRESH_EXPIRATION` | no | Refresh token lifetime in seconds, default `604800` |
| `CLOUDINARY_CLOUD_NAME` | for uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | for uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | for uploads | Cloudinary API secret |

Generate a random secret with:

```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## frontend/.env

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Backend base URL **including** `/api/v1`, e.g. `http://localhost:3000/api/v1` |

⚠️ Never commit `.env` files to Git.

---

# 🌿 Git Workflow (Team)

We use:

- main → production
- develop → integration branch
- feature/<feature-name> → individual work

Example:

```
git checkout -b feature/auth
git add .
git commit -m "feat: add login system"
git push origin feature/auth
```

Then create Pull Request to `develop`.

---

# 🧪 Running Both Together

Option 1: Open 2 terminals  
Option 2: Use VSCode split terminal

Terminal 1:
```
cd backend
npm run start:dev
```

Terminal 2:
```
cd frontend
npm run dev
```

---

# 🛠️ Common Issues

### 1. MongoDB Connection Error
- Check your MONGO_URI
- Make sure Atlas IP whitelist includes your IP

### 2. CORS Error
Make sure backend has:

```
app.enableCors();
```

### 3. Port Already In Use
Change backend PORT in `.env`

---

# 📌 Development Rules

- Do NOT push `.env`
- Do NOT push `node_modules`
- Always create feature branch
- Pull latest develop before starting new feature

---

# 🚀 Deployment (Future)

- Frontend → Vercel
- Backend → Render / Railway
- Database → MongoDB Atlas

---

# Project Origins and Credits

EasyApartment began as a student team project. This version is independently maintained by a member of the original team with the team's agreement.

Credit for the original work goes to the EasyProperty Team. See the [original EasyApartment repository](https://github.com/kam345678/EasyApartment) for its contribution history.
