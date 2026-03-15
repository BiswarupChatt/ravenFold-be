# API Standards — Raven Fold Backend

This document defines the API design standards for the Raven Fold backend.

All APIs in this project must follow these rules to ensure consistency, maintainability, and predictable behavior for both developers and AI-assisted code generation.

---

# 1. Base API Structure

All endpoints must be prefixed with:

/api

Example:

/api/products
/api/orders
/api/users

---

# 2. RESTful API Design

APIs must follow REST principles.

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

# 3. Standard API Response Format

All successful responses must follow this format.

{
"success": true,
"message": "Products fetched successfully",
"data": []
}

Example:

{
"success": true,
"message": "Product created",
"data": {
"id": "123",
"name": "Leather Wallet"
}
}

Rules:

• `success` must always be present
• `message` must describe the result
• `data` contains the response payload

---

# 4. Error Response Format

All errors must follow this structure.

{
"success": false,
"message": "Product not found",
"error": {
"code": "PRODUCT_NOT_FOUND"
}
}

Example:

{
"success": false,
"message": "Invalid request data",
"error": {
"code": "VALIDATION_ERROR"
}
}

Rules:

• Never expose stack traces
• Error messages must be human-readable
• Error codes must be consistent

---

# 5. HTTP Status Code Rules

APIs must use proper HTTP status codes.

200 OK
Successful GET request

201 Created
Resource successfully created

400 Bad Request
Invalid request data

401 Unauthorized
Authentication required

403 Forbidden
Access denied

404 Not Found
Resource does not exist

500 Internal Server Error
Unexpected server error

---

# 6. Pagination Standard

For list APIs returning large datasets.

Example:

GET /api/products?page=1&limit=10

Response:

{
"success": true,
"message": "Products fetched",
"data": [],
"pagination": {
"page": 1,
"limit": 10,
"total": 120
}
}

Rules:

• Default limit should be defined
• Maximum limit should be restricted

---

# 7. Request Validation

All POST and PATCH requests must validate input.

Validation responsibilities:

Controller → Basic validation
Service → Business rule validation

Future improvement:

Introduce a validation layer using libraries such as:

Zod
Joi

---

# 8. Naming Conventions

Resources must use plural names.

Correct:

/api/products
/api/orders
/api/users

Incorrect:

/api/product
/api/getProducts

---

# 9. API Versioning

Future APIs should support versioning.

Example:

/api/v1/products
/api/v1/orders

This allows backward compatibility when APIs evolve.

---

# 10. Security Guidelines

Sensitive data must never be exposed in API responses.

Never return:

passwords
internal system errors
private tokens

Always sanitize responses.

---

# 11. Consistent Response Utilities

All controllers should use response helper utilities.

Example utility:

utils/apiResponse.js

Example usage:

return successResponse(res, "Product created", product)

This ensures uniform responses across all endpoints.

---

# 12. Logging

All errors must be logged internally.

Logging should include:

error message
request path
timestamp

Production logging should use a centralized logger.

---

# 13. AI Development Rules

When AI tools generate APIs, they must:

• Follow the response format defined in this document
• Use proper HTTP status codes
• Respect REST naming conventions
• Avoid introducing inconsistent response structures

---

# 14. Future Improvements

Planned API improvements include:

• request validation middleware
• standardized error classes
• API documentation generation (Swagger / OpenAPI)
• rate limiting
• caching

---
