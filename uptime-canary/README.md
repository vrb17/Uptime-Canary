# Uptime Canary

A lightweight uptime monitoring application built with Next.js, NextAuth, and Prisma.

## Features

- 🔐 **Authentication**: Email/password authentication with NextAuth.js
- 🛡️ **Protected Routes**: Dashboard and checks pages require authentication
- 📊 **Uptime Monitoring**: Monitor websites and APIs
- 🎨 **Modern UI**: Built with shadcn/ui components
- 🗄️ **Database**: SQLite with Prisma ORM

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"

# Email Alerts (Optional - will fallback to console.log if not set)
RESEND_API_KEY="your_resend_key_here"
EMAIL_FROM="Uptime Canary <alerts@your-domain.com>"

# Cron Job Security (Required for production)
CRON_SECRET="your-cron-secret-here-change-in-production"
```

## Production Checklist

Before deploying to production, ensure the following:

### Environment Variables
Set these environment variables in your production environment:

```env
# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secure-random-secret-here"

# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Email (Resend)
RESEND_API_KEY="your_resend_api_key"
EMAIL_FROM="Uptime Canary <alerts@your-domain.com>"

# Cron Security
CRON_SECRET="your-secure-random-secret-here"
```

### Database Setup
1. **Run Prisma migrations:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Verify database connection:**
   ```bash
   npx prisma db push
   ```

### Vercel Configuration
1. **Ensure vercel.json is present** with cron job configuration
2. **Set environment variables** in Vercel dashboard
3. **Deploy the application**

### Testing Commands
Test your production deployment with these curl commands:

```bash
# Health check
curl https://your-domain.com/api/health
# Expected: {"ok":true,"ts":"2024-01-01T00:00:00.000Z"}

# Cron job (with secret)
curl -H "x-cron-secret: $CRON_SECRET" https://your-domain.com/api/cron/run
# Expected: {"ran":0,"successes":0,"failures":0,"errors":0}
```

### First User Flow
1. **Sign up** at `/signup`
2. **Add a check** at `/checks`
3. **Wait for cron job** to run (every minute)
4. **Check dashboard** at `/dashboard`
5. **Verify email alerts** (if configured)
6. **Create status page** for public monitoring

### Monitoring
- **Health endpoint**: `/api/health` for uptime monitoring
- **Cron logs**: Check Vercel function logs for cron job execution
- **Application logs**: JSON structured logging for all API operations

## Authentication

The application uses NextAuth.js with the following features:

- **Credentials Provider**: Email/password authentication
- **Protected Routes**: `/dashboard` and `/checks` require authentication
- **Session Management**: JWT-based sessions
- **User Registration**: Custom registration API endpoint

### Routes

- `/` - Landing page (redirects to dashboard if authenticated)
- `/login` - Login page
- `/signup` - Registration page
- `/dashboard` - Protected dashboard (requires authentication)
- `/checks` - Protected checks management (requires authentication)
- `/settings/notifications` - Protected notification preferences (requires authentication)

## Email Alerts

The application sends email alerts when incidents are created or resolved:

- **DOWN Alerts**: Sent when a check fails consecutively and an incident is opened
- **RECOVERED Alerts**: Sent when a check recovers and an incident is resolved
- **Fallback**: If email configuration is missing, alerts are logged to console for local development
- **Provider**: Uses Resend for email delivery (configurable via environment variables)

## Notification Preferences

Users can manage their notification preferences through the settings page:

- **Multiple Email Addresses**: Add multiple email addresses to receive alerts
- **Enable/Disable**: Toggle notifications on/off for each preference
- **User Management**: Each user can manage their own notification preferences
- **Fallback**: If no preferences are set, alerts are sent to the user's primary email
- **Access**: Navigate to `/settings/notifications` to manage preferences

### Features

- **Add Preferences**: Add new email addresses for notifications
- **Edit Preferences**: Update email addresses or enable/disable notifications
- **Delete Preferences**: Remove notification preferences
- **Validation**: Input validation with Zod schemas
- **User Ownership**: Users can only manage their own preferences

### Email Configuration

To enable email alerts, add the following to your `.env` file:

```env
RESEND_API_KEY="your_resend_key_here"
EMAIL_FROM="Uptime Canary <alerts@your-domain.com>"
```

If these variables are not set, the application will fallback to console logging for local development.

## Vercel Cron Jobs

The application includes automatic uptime monitoring via Vercel Cron Jobs. The cron job runs every minute to check all enabled uptime monitors.

### Setup

1. **Add CRON_SECRET to your environment:**
   - Add to your local `.env.local` file:
     ```env
     CRON_SECRET="your-secure-random-secret-here"
     ```
   - Add to your Vercel project environment variables in the Vercel dashboard

2. **Deploy to Vercel:**
   - The `vercel.json` file is already configured with the cron job
   - Deploy your project to Vercel to enable automatic cron job execution
   - Vercel will automatically trigger the cron job every minute

3. **Manual Testing:**
   You can manually test the cron endpoint using curl:
   ```bash
   curl -H "x-cron-secret: $CRON_SECRET" https://your-deployment.vercel.app/api/cron/run
   ```

### How it Works

- The cron job runs every minute (`* * * * *` schedule)
- It checks all enabled uptime monitors that are due for checking
- Creates incidents after 3 consecutive failures
- Resolves incidents after 2 consecutive successes
- Sends email alerts for incidents and recoveries
- Returns a summary of the execution results

## Database Schema

The application uses Prisma with the following models:

- **User**: User accounts with email/password
- **Account**: OAuth accounts (for future OAuth providers)
- **Session**: User sessions
- **VerificationToken**: Email verification tokens

## Development

### Database Commands

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

### Type Checking

```bash
npx tsc --noEmit
```

## Production Deployment

For production deployment:

1. Change the database URL to a production database (PostgreSQL recommended)
2. Set a strong NEXTAUTH_SECRET
3. Update NEXTAUTH_URL to your production domain
4. Run database migrations

## License

MIT
