# Checks API Documentation

This document describes the Checks CRUD API endpoints for the Uptime Canary application.

## Authentication

All endpoints require authentication via NextAuth session. Include your session cookie in requests.

## Endpoints

### GET /api/checks

Returns all checks for the authenticated user, ordered by creation date (newest first).

**Response:**
```json
[
  {
    "id": "check_123",
    "name": "My Website",
    "url": "https://example.com",
    "method": "GET",
    "expectedStatus": 200,
    "intervalSeconds": 60,
    "timeoutMs": 10000,
    "enabled": true,
    "lastStatus": "UNKNOWN",
    "lastCheckedAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (no valid session)

### POST /api/checks

Creates a new check for the authenticated user.

**Request Body:**
```json
{
  "name": "My Website",
  "url": "https://example.com",
  "method": "GET",
  "intervalSec": 60,
  "timeoutMs": 10000,
  "expectedCode": 200,
  "enabled": true
}
```

**Field Descriptions:**
- `name` (required): Human-readable name for the check
- `url` (required): URL to monitor (must be valid URL format)
- `method` (required): HTTP method - "GET", "HEAD", or "POST"
- `intervalSec` (required): Check interval in seconds (30-3600)
- `timeoutMs` (required): Request timeout in milliseconds (1000-30000)
- `expectedCode` (optional): Expected HTTP status code (default: 200)
- `enabled` (optional): Whether the check is enabled (default: true)

**Response:** Returns the created check object with status `201`

**Status Codes:**
- `201` - Created successfully
- `400` - Validation error
- `401` - Unauthorized (no valid session)
- `500` - Internal server error

### GET /api/checks/[id]

Returns a specific check owned by the authenticated user.

**Response:** Returns the check object (same format as GET /api/checks)

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (no valid session)
- `404` - Check not found or not owned by user

### PATCH /api/checks/[id]

Updates a specific check owned by the authenticated user.

**Request Body:** Same fields as POST, but all are optional
```json
{
  "name": "Updated Website Name",
  "enabled": false
}
```

**Response:** Returns the updated check object

**Status Codes:**
- `200` - Updated successfully
- `400` - Validation error
- `401` - Unauthorized (no valid session)
- `404` - Check not found or not owned by user
- `500` - Internal server error

### DELETE /api/checks/[id]

Deletes a specific check owned by the authenticated user.

**Response:**
```json
{
  "message": "Check deleted successfully"
}
```

**Status Codes:**
- `200` - Deleted successfully
- `401` - Unauthorized (no valid session)
- `404` - Check not found or not owned by user
- `500` - Internal server error

## Error Responses

All endpoints return structured error responses:

```json
{
  "error": "Error message",
  "details": [] // Validation errors (when applicable)
}
```

## Security Features

- **Authentication Required**: All endpoints require a valid session
- **User Isolation**: Users can only access their own checks
- **Input Validation**: All inputs are validated with Zod schemas
- **Type Safety**: Full TypeScript support with no `any` types

## Example Usage

### Creating a Check
```bash
curl -X POST /api/checks \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "name": "Production API",
    "url": "https://api.example.com/health",
    "method": "GET",
    "intervalSec": 300,
    "timeoutMs": 5000,
    "expectedCode": 200
  }'
```

### Updating a Check
```bash
curl -X PATCH /api/checks/check_123 \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "enabled": false,
    "intervalSec": 600
  }'
```

### Deleting a Check
```bash
curl -X DELETE /api/checks/check_123 \
  -H "Cookie: your-session-cookie"
```
