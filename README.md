# Task Management Backend API
A scalable and secure Task Management Backend built using Node.js, Express.js, and MongoDB.
This backend provides REST APIs for user authentication, task management, scheduling, notifications, email services, and automated background jobs.

---

# 🚀 Features
- User Authentication & Authorization
- JWT Based Login/Register
- Create, Update & Delete Tasks
- Task Status Management
- Task Priority Management
- Due Date Scheduling
- Cron Jobs for Automated Tasks
- Email Notifications using Nodemailer
- RESTful API Architecture
- MongoDB Database Integration
- Middleware Based Security
- Input Validation & Error Handling
- Modular Folder Structure
- Environment Variable Support

---

# 🛠 Tech Stack
| Technology             | Purpose                            |
| ---------------------- | ---------------------------------- |
| `Node.js`              | Backend Runtime Environment        |
| `Express.js`           | Web Server Framework               |
| `MongoDB`              | NoSQL Database                     |
| `Mongoose`             | MongoDB Object Data Modeling (ODM) |
| `Nodemailer`           | Email Sending Service              |
| `node-cron`            | Scheduled Cron Jobs                |
| `JSON Web Token (JWT)` | Authentication and Authorization   |
| `Bcrypt`               | Password Hashing and Encryption    |

---

# 📁 Project Structure
```bash
project-root/
│
├── config/
├── controllers/
├── cron/
├── middleware/
├── models/
├── public/
├── routes/
├── services/
├── utils/
├── validations/
│
├── .gitignore
├── app.js
├── server.js
├── package.json
└── package-lock.json
```

---

# 📂 Folder Explanation
| Folder         | Description                                        |
| -------------- | -------------------------------------------------- |
| `config/`      | Database and application configuration files       |
| `controllers/` | Contains business logic and controller functions   |
| `cron/`        | Scheduled cron jobs and automated background tasks |
| `middleware/`  | Authentication and custom middleware functions     |
| `models/`      | MongoDB schemas and database models                |
| `public/`      | Public/static files accessible by users            |
| `routes/`      | API route definitions                              |
| `services/`    | Service layer and reusable business services       |
| `utils/`       | Helper and utility functions                       |
| `validations/` | Request validation schemas and logic               |

---

# ⚙️ Installation
## 1️⃣ Clone Repository
```bash
git clone https://github.com/your-username/task-management-backend.git
```

## 2️⃣ Move Into Project Directory
```bash
cd task-management-backend
```

## 3️⃣ Install Dependencies
```bash
npm install
```

---

# 🔐 Environment Variables

Create a `.env` file in the root directory.

```env
PORT = 
MONGO_URI = 
OTP_EXP_MINUTES = 
ACCESS_TOKEN_SECRET = 
ACCESS_TOKEN_EXPIRY = 
REFRESH_TOKEN_SECRET = 
REFRESH_TOKEN_EXPIRY = 
SMTP_HOST = 
SMTP_PORT = 
SMTP_USER = 
SMTP_PASS = 
CLOUDINARY_CLOUD_NAME = 
CLOUDINARY_API_KEY = 
CLOUDINARY_API_SECRET = 
STRIPE_PUBLISHABLE_KEY = 
STRIPE_SECRET_KEY = 
STRIPE_WEBHOOK_SECRET = 
STRIPE_WEBHOOK_DEBUG = 
STRIPE_SUCCESS_URL = 
STRIPE_CANCEL_URL = 
FRONTEND_URL = 
ACCESS_COOKIE_MAX_AGE_MS = 
REFRESH_COOKIE_MAX_AGE_MS = 
```

---

# ▶️ Run Application
## Development Mode

```bash
npm run dev
```

## Production Mode
```bash
npm start
```

---


# 📧 Email Service (Nodemailer)
This project uses Nodemailer for sending:
- Welcome Emails
- Task Reminder Emails
- Due Date Notifications
- Password Reset Emails

---

# ⏰ Cron Jobs
This project uses node-cron for automated scheduled tasks.
## Example Use Cases
- Send Task Reminder Emails
- Update Expired Tasks
- Daily Task Reports
- Cleanup Old Logs

---

# 🛡 Security Features
- JWT Authentication
- Password Hashing
- Protected Routes
- Environment Variables
- Request Validation
- Error Handling Middleware

---

# 🧪 API Testing
You can test APIs using:
- Postman

---

# 📌 Future Improvements
- Real-Time Notifications
- Team Collaboration
- File Attachments
- Task Comments
- Calendar Integration
- Docker Support
- Redis Caching

---

# 📄 License
This project is licensed under the MIT License.

---

# 👨‍💻 Author
Developed by Avi Italiya
