# Raven Fold Backend

Backend API for the **Raven Fold** platform.

This service provides REST APIs for managing users, products, orders, and other business logic required by the Raven Fold website.

The backend is built using **Node.js and Express** and follows a **layered architecture** to keep the code scalable and maintainable.

## Documentation

Developers and AI tools must read the following documents before contributing:

docs/ARCHITECTURE.md  
docs/API_STANDARDS.md  
docs/AI_DEVELOPMENT_RULES.md

---

# Tech Stack

Backend Framework

* Node.js
* Express.js

Core Libraries

* cors
* helmet
* dotenv
* morgan

Development Tools

* nodemon

---

# Project Structure

src
├ routes
├ controllers
├ services
├ models
├ middlewares
├ utils
├ config
├ app.js
└ server.js

---

# Application Layers

The backend follows a **clean layered architecture**.

Request Flow:

Route → Controller → Service → Database

Routes
Define API endpoints and forward requests to controllers.

Controllers
Handle HTTP requests and responses.

Services
Contain the business logic of the application.

Models
Handle database operations.

---

# API Base URL

All APIs are served under:

/api

Example endpoints:

GET /api/products
GET /api/products/:id
POST /api/products
PATCH /api/products/:id
DELETE /api/products/:id

---

# Environment Variables

Create a `.env` file in the project root.

Example:

PORT=5000
NODE_ENV=development

Additional variables may include:

DATABASE_URL
JWT_SECRET
API_KEYS

---

# Running the Project

Install dependencies:

npm install

Run in development mode:

npm run dev

Run in production mode:

npm start

---

# Development Guidelines

• Routes must not contain business logic
• Controllers should stay lightweight
• Services must contain core business logic
• Database access should only happen in services or models

---

# Security

The server includes basic security middleware:

helmet → secure HTTP headers
cors → cross-origin request handling
dotenv → environment variable management

---

# Future Improvements

Possible future improvements include:

• request validation layer
• centralized logging system
• rate limiting
• API versioning
• caching layer

---

# AI Development

AI-assisted tools (such as Codex) must follow the rules defined in:

docs/AI_DEVELOPMENT_RULES.md

This ensures consistent architecture and prevents unnecessary technical debt.

---

# Author

Biswarup Chatterjee
