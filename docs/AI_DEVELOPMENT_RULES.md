# AI Development Rules — Raven Fold Backend

## Purpose

This document defines architectural rules and development guidelines for AI-assisted development (Codex or similar tools).
The AI must follow these rules when generating or modifying code in this repository.

---

# 1. Project Architecture

The backend follows a **layered architecture**:

Route → Controller → Service → Database

Responsibilities:

Routes

* Define API endpoints
* Must contain NO business logic

Controllers

* Handle request/response
* Validate request input
* Call services

Services

* Contain business logic
* Interact with models

Models

* Database schemas or ORM logic

---

# 2. Folder Structure

All code must follow this structure:

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

Rules:

• Routes only define endpoints
• Controllers must not contain database queries
• Database logic must live in services or models

---

# 3. Express Route Rules

All route files must:

• Be named with `.routes.js` suffix
• Export an Express Router
• Never export objects

Correct example:

module.exports = router

Incorrect example:

module.exports = { router }

---

# 4. API Conventions

All APIs must follow REST standards.

Examples:

GET /api/products
GET /api/products/:id
POST /api/products
PATCH /api/products/:id
DELETE /api/products/:id

Rules:

• Use plural resource names
• Avoid verbs in URLs
• Use HTTP methods properly

---

# 5. Error Handling

All async controllers must use try/catch.

Errors must be forwarded to the global error handler.

Example:

next(error)

Never send stack traces to clients.

---

# 6. Environment Variables

All configuration must come from `.env`.

Examples:

PORT
DATABASE_URL
JWT_SECRET

Never hardcode secrets.

---

# 7. Security Rules

The application must use:

helmet
cors
rate limiting (future)

Never disable security middleware.

---

# 8. Logging

All server logs must go through a logging utility.

Avoid console.log in production code.

---

# 9. Dependency Rules

Allowed core dependencies:

express
cors
helmet
dotenv
morgan

New dependencies must be minimal and justified.

---

# 10. Coding Standards

• Use clear variable names
• Avoid nested logic deeper than 3 levels
• Prefer early returns
• Functions should be small and focused
• Avoid large controller files

---

# 11. Tech Debt Policy

The AI must not introduce:

• duplicated code
• unused imports
• commented dead code
• inconsistent naming
• hardcoded configuration

If tech debt is introduced, it must be documented in TECH_DEBT.md.

---

# 12. Naming Conventions

Files:

user.routes.js
user.controller.js
user.service.js

Variables:

camelCase

Constants:

UPPER_CASE

---

# 13. Database Rules

Database queries must never appear in routes.

Allowed layers:

service
model

---

# 14. Code Quality Rules

Before generating code, the AI should ensure:

• No duplicate logic
• Clear separation of concerns
• Maintainable structure

---

# 15. Performance Rules

Avoid:

• unnecessary loops
• synchronous blocking operations
• repeated database queries

---

# 16. Future Improvements (Known Tech Debt)

Potential areas of improvement:

• request validation layer
• centralized logger
• API versioning
• rate limiting
• caching

---

# 17. AI Behavior Rules

When generating code, the AI must:

1. Respect the folder architecture
2. Avoid modifying unrelated files
3. Prefer existing utilities
4. Avoid rewriting working code unnecessarily
5. Maintain consistency with existing patterns

---
