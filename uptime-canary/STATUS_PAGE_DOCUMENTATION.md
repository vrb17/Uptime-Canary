# Status Page Documentation

## Overview

The status page feature allows you to create public-facing status pages that display the health of your monitored services. These pages are accessible without authentication and provide real-time information about your checks and incidents.

## Features

- **Public Access**: Status pages are accessible without login
- **Real-time Status**: Shows current status of all monitored services
- **Uptime Statistics**: Displays 24-hour uptime percentage for each service
- **Response Time Charts**: Sparkline charts showing response time trends
- **Incident Timeline**: Recent incidents with detailed information
- **Customizable**: Set custom titles, descriptions, and select which checks to display

## Database Schema

### StatusPage Model
```prisma
model StatusPage {
  id          String   @id @default(cuid())
  userId      String
  slug        String   @unique
  title       String
  description String?
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  items       StatusPageItem[]
}
```

### StatusPageItem Model
```prisma
model StatusPageItem {
  id           String     @id @default(cuid())
  statusPageId String
  checkId      String
  order        Int        @default(0)
  createdAt    DateTime   @default(now())
  statusPage   StatusPage @relation(fields: [statusPageId], references: [id], onDelete: Cascade)
  check        Check      @relation(fields: [checkId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

### GET /api/status-pages
List all status pages for the authenticated user.

**Response:**
```json
[
  {
    "id": "status_page_id",
    "slug": "my-status-page",
    "title": "My Status Page",
    "description": "Status of our services",
    "enabled": true,
    "items": [
      {
        "check": {
          "id": "check_id",
          "name": "Website",
          "url": "https://example.com",
          "lastStatus": "UP",
          "lastCheckedAt": "2024-01-01T12:00:00Z"
        }
      }
    ]
  }
]
```

### POST /api/status-pages
Create a new status page.

**Request Body:**
```json
{
  "slug": "my-status-page",
  "title": "My Status Page",
  "description": "Status of our services",
  "enabled": true,
  "checkIds": ["check_id_1", "check_id_2"]
}
```

### GET /api/status-pages/[id]
Get a specific status page by ID.

### PUT /api/status-pages/[id]
Update a status page.

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "enabled": false,
  "checkIds": ["check_id_1", "check_id_3"]
}
```

### DELETE /api/status-pages/[id]
Delete a status page.

## Public Status Page

### Route: `/status/[slug]`

The public status page is accessible at `/status/[slug]` where `[slug]` is the unique identifier for the status page.

**Features:**
- Displays status page title and description
- Shows all configured checks with their current status
- Displays 24-hour uptime percentage for each check
- Shows response time sparkline charts
- Lists recent incidents with timestamps and details
- Responsive design that works on all devices

**Example URL:** `http://localhost:3000/status/test-status`

## Components

### StatusPageHeader
Displays the title and description of the status page.

### StatusPageChecks
Shows all checks with their status, uptime percentage, and response time charts.

### StatusPageIncidents
Displays a timeline of recent incidents with detailed information.

## Testing

A test script is provided to create sample data:

```bash
npx tsx scripts/create-test-status-page.ts
```

This creates:
- A test user
- Two sample checks
- A status page with slug "test-status"
- Sample check results for the last 24 hours
- Sample incidents

Visit `http://localhost:3000/status/test-status` to see the status page in action.

## Security

- Status pages are public and don't require authentication
- Only enabled status pages are accessible
- Users can only manage their own status pages through the API
- Input validation is performed on all API endpoints

## Error Handling

- 404 errors for non-existent or disabled status pages
- Proper error boundaries for React components
- Loading states with skeleton components
- Graceful fallbacks for missing data

## Performance

- Efficient database queries with proper indexing
- Optimized data fetching for status pages
- Caching-friendly design
- Minimal JavaScript for fast loading
