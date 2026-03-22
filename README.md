# DeadDrop

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-000000?logo=express&logoColor=white)

## 📝 Description
DeadDrop is a secure, anonymous file drop platform for sharing files with expiring, self-destructing links. Files can be protected with passwords, limited by download count, and automatically cleaned up after expiration. The project uses a React frontend and a TypeScript + Express backend with SQLite for zero external database setup.

## ✨ Features
- Anonymous file sharing with generated unique download links
- Drag-and-drop upload UX with modern animated interface
- Configurable file expiration (1 hour, 24 hours, 7 days)
- Configurable download limits per file
- Optional password protection for shared files
- Password hashing with bcrypt before storage
- Automatic file self-destruction when:
  - Expired
  - Download limit is reached
- Scheduled background cleanup job (runs every 5 minutes)
- UUID-based file identifiers with server-side validation
- Secure file metadata storage in SQLite
- Browser-based file download with response header support for filenames
- Dedicated result page with copy-to-clipboard share link
- Favicon, web manifest, and installable icon set support

## 🛠️ Tech Stack
Frontend:
- React 19
- TypeScript
- Vite
- React Router
- Axios
- Tailwind CSS
- Framer Motion
- GSAP
- Lucide Icons

Backend:
- Node.js
- Express
- TypeScript
- Multer (file uploads)
- bcrypt (password hashing)
- node-cron (scheduled cleanup)
- uuid

Database:
- SQLite via better-sqlite3 (embedded database, no external setup required)

## 📋 Prerequisites
- Node.js 18 or higher (recommended: Node.js 20+)
- npm 9 or higher

## 🚀 Installation and Setup

### 1. Clone the repository
	git clone https://github.com/isthatpratham/DeadDrop.git
	cd DeadDrop

### 2. Backend setup
Install backend dependencies from the project root:

	npm install

Create environment file:

	copy .env.example .env

Start backend in development mode:

	npm run dev

Backend will run by default at:
- http://localhost:5000

Health check:
- GET http://localhost:5000/  → API running

### 3. Frontend setup
Open a second terminal:

	cd frontend
	npm install
	npm run dev

Frontend will run on Vite default port (usually):
- http://localhost:5173

## 🔧 Environment Variables
Create a .env file in the project root with:

	PORT=5000
	NODE_ENV=development

Variable reference:
- PORT: Backend server port
- NODE_ENV: Runtime mode (development or production)

## 📡 API Endpoints
- POST /api/upload
  - Multipart field name: file
  - Optional body fields:
	- expiryMinutes
	- maxDownloads
	- password
- GET /api/download/:id
  - Optional query:
	- password

## 📁 Project Structure
	DeadDrop/
	├── backend/
	│   └── database/
	│       └── sqlite-setup.js
	├── frontend/
	│   ├── public/
	│   ├── src/
	│   │   ├── components/
	│   │   ├── layouts/
	│   │   ├── pages/
	│   │   ├── services/
	│   │   └── utils/
	│   └── index.html
	├── src/
	│   ├── config/
	│   ├── controllers/
	│   ├── routes/
	│   ├── services/
	│   ├── utils/
	│   ├── app.ts
	│   └── server.ts
	├── uploads/
	├── .env.example
	├── package.json
	└── README.md

## 🔒 Security Features
- Password-protected file links
- Passwords are hashed with bcrypt (never stored in plain text)
- UUIDv4 identifiers reduce predictable link patterns
- Server-side UUID format validation for download routes
- Allowed MIME type filtering during upload
- Upload size limit enforced on server
- Automatic deletion of expired files and metadata
- One-time/limited-use download behavior based on max download count
- SQLite foreign keys enabled and WAL mode activated


## 🤝 Contributing
Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes with clear messages
4. Push your branch
5. Open a Pull Request

Recommended before submitting:

	npm run build
	cd frontend && npm run build

## 📄 License
This project is licensed under the MIT License. See the LICENSE file for details.

## 👤 Author
Pratham
- GitHub: https://github.com/isthatpratham
