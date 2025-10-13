# Vercel Cron Job Setup for PDF Font Files

## Overview

This project uses a Vercel Cron Job to ensure the Helvetica.afm font file is available in the correct location for PDF generation in serverless environments.

## Setup Instructions

### 1. Add Serverless Function

The cron endpoint is already created at `/app/api/cron/route.ts`. This endpoint:

- Creates the required directory structure
- Copies the Helvetica.afm file from node_modules to the correct location
- Requires authentication via the `CRON_SECRET` environment variable

### 2. Configure Cron Job in vercel.json

The `vercel.json` file configures the cron schedule:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 10 * * **"
    }
  ]
}
```

**Schedule:** `0 10 * * **` means the cron runs at 10:00 AM every day (UTC).

You can modify the schedule using cron syntax:

- `0 * * * *` - Every hour
- `*/15 * * * *` - Every 15 minutes
- `0 0 * * *` - Once a day at midnight
- `0 */6 * * *` - Every 6 hours

### 3. Add Secret to Vercel Project

#### Generate a Secret

Run this command to generate a random secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Add to Vercel

1. Go to your project on Vercel Dashboard
2. Go to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `CRON_SECRET`
   - **Value:** Your generated secret
   - **Environments:** Production, Preview, Development

### 4. Build Script (Already Configured)

The `package.json` includes the build command that copies the font file:

```json
"build": "next build && mkdir -p .next/server/vendor-chunks/data && cp node_modules/pdfkit/js/data/Helvetica.afm .next/server/vendor-chunks/data/"
```

This ensures the font file is available immediately after build.

### 5. Deploy to Vercel

```bash
git add .
git commit -m "Add Vercel cron job for PDF fonts"
git push
```

Vercel will automatically:

1. Detect the `vercel.json` cron configuration
2. Register the cron job
3. Execute it on the specified schedule

### 6. Verify Cron Job

#### Check Cron Status

1. Go to Vercel Dashboard → Your Project
2. Click on **Cron Jobs** tab
3. You should see your cron job listed with its schedule

#### Test Manually

You can test the cron endpoint locally:

```bash
curl -X GET http://localhost:3000/api/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or test on production:

```bash
curl -X GET https://your-domain.vercel.app/api/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:

```json
{
  "ok": true,
  "message": "Helvetica.afm file copied successfully",
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

### 7. Monitor Cron Executions

- Go to Vercel Dashboard → Your Project → Cron Jobs
- Click on your cron job to see execution logs
- Check for any errors or successful runs

## How It Works

1. **Build Time:** The build script copies the Helvetica.afm file to `.next/server/vendor-chunks/data/`
2. **Runtime:** The PDF generation uses the embedded TTF fonts (DejaVu Sans) to avoid needing AFM files
3. **Cron Job (Backup):** Runs daily to ensure the AFM file is in place as a fallback
4. **Security:** The cron endpoint requires the `CRON_SECRET` header for authentication

## Troubleshooting

### Cron not appearing in Vercel Dashboard

- Ensure `vercel.json` is in the project root
- Redeploy the project after adding `vercel.json`
- Check Vercel's cron job limits for your plan

### Cron failing with 401 Unauthorized

- Verify `CRON_SECRET` is set in Vercel environment variables
- Check that the secret matches what you're sending in the Authorization header
- Vercel automatically adds the correct header when invoking cron jobs

### Font still not found

- Check the build logs to ensure the copy command succeeded
- Verify the path: `.next/server/vendor-chunks/data/Helvetica.afm`
- The main PDF generation already uses TTF fonts and shouldn't need this AFM file
- This cron is a fallback measure

## Alternative: Postbuild Hook

If you prefer not to use a cron job, you can rely solely on the build script, which already runs the copy command.

## Notes

- The primary PDF generation uses TTF fonts (DejaVu Sans) embedded from `node_modules`
- This cron job is a defensive measure to ensure compatibility
- Vercel's serverless functions are ephemeral, so copied files won't persist between invocations
- The build-time copy ensures files are bundled into the deployment

## Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Cron Schedule Expression](https://crontab.guru/)
