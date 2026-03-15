# Backend Architecture

This document explains the architecture and design principles used in the Raven Fold backend.

The system is designed to be **scalable, modular, and easy to maintain**.

---

# Architectural Pattern

The backend uses a **layered architecture**.

Flow of a request:

Client Request
↓
Route
↓
Controller
↓
Service
↓
Database

---

# Layer Responsibilities

## Routes

Location:

src/routes

Responsibilities:

• Define API endpoints
• Map endpoints to controllers
• Apply route-level middleware

Routes must not contain business logic.

Example:

router.post("/products", productController.createProduct)

---

## Controllers

Location:

src/controllers

Responsibilities:

• Handle incoming HTTP requests
• Validate basic request structure
• Call appropriate service methods
• Return responses to clients

Controllers should remain lightweight.

Example responsibilities:

• parsing request body
• returning response JSON
• error forwarding

---

## Services

Location:

src/services

Responsibilities:

• Implement business logic
• Communicate with database models
• Perform data transformations
• Coordinate multiple operations

Services contain the **core logic of the application**.

---

## Models

Location:

src/models

Responsibilities:

• Define database schema
• Interact with the database
• Handle CRUD operations

Models should not contain business rules.

---

## Middlewares

Location:

src/middlewares

Responsibilities:

• authentication
• request validation
• error handling
• request logging

Middlewares intercept requests before reaching controllers.

---

## Utilities

Location:

src/utils

Reusable helper functions such as:

• logger
• response formatter
• async error wrappers

Utilities should be stateless and reusable.

---

# Route Loading Strategy

Routes are automatically loaded using a route loader.

Each route file must:

• end with `.routes.js`
• export an Express router

Example:

module.exports = router

This ensures the application can dynamically register routes without modifying `app.js`.

---

# Application Entry Points

Two main entry files exist.

app.js

Initializes the Express application.

Responsibilities:

• register middleware
• load routes
• configure global error handling

server.js

Starts the HTTP server and listens on the configured port.

---

# Error Handling Strategy

Errors should be forwarded using:

next(error)

A global error handler will process all errors and return consistent responses.

---

# Scalability Strategy

The architecture is designed to support:

• API versioning
• microservice extraction
• caching layers
• queue systems
• horizontal scaling

---

# Coding Principles

The backend follows these principles:

Separation of Concerns
Each layer has a clearly defined responsibility.

Single Responsibility
Each module should have one purpose.

Consistency
File naming and folder structure must remain consistent.

Maintainability
Code should be easy to read and modify.

---

# Future Architecture Enhancements

Planned improvements include:

• request validation layer
• centralized logger
• distributed caching
• background job queue
• API versioning

---
