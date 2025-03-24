# Google Drive API Integration Setup Guide

This guide will walk you through setting up the Google Drive API integration for the PDF Editor application.

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on "Select a project" at the top of the page
3. Click on "New Project"
4. Enter a project name (e.g., "PDF Editor")
5. Click "Create"

## Step 2: Enable the Google Drive API

1. In your new project, go to the "APIs & Services" > "Library" section
2. Search for "Google Drive API"
3. Click on "Google Drive API" in the search results
4. Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (unless you have a Google Workspace organization)
3. Click "Create"
4. Fill in the required information:
   - App name: "PDF Editor"
   - User support email: Your email address
   - Developer contact information: Your email address
5. Click "Save and Continue"
6. Add the following scopes:
   - `.../auth/drive.readonly`
   - `.../auth/drive.metadata.readonly`
7. Click "Save and Continue"
8. Add test users (your email address)
9. Click "Save and Continue"
10. Review your settings and click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Name: "PDF Editor Web Client"
5. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - Your production domain (if applicable)
6. Add authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - Your production domain (if applicable)
7. Click "Create"
8. Note your Client ID and Client Secret

## Step 5: Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key
4. Click "Restrict Key" to set restrictions:
   - API restrictions: Select "Google Drive API"
   - Application restrictions: Select "HTTP referrers" and add your domains

## Step 6: Update Configuration in the Application

1. Open `/src/app/config/googleDriveConfig.js`
2. Replace `YOUR_CLIENT_ID_HERE` with your actual Client ID
3. Replace `YOUR_API_KEY_HERE` with your actual API Key

## Step 7: Test the Integration

1. Start your application
2. Try to upload a PDF from Google Drive
3. You should be prompted to sign in with Google
4. After signing in, you should see your PDF files from Google Drive

## Troubleshooting

### Common Errors

#### "Error 403: access_denied"

This error typically occurs when there's an issue with your OAuth consent screen or project configuration:

1. **OAuth Consent Screen Configuration:**
   - Make sure your app is properly configured in the OAuth consent screen
   - If your app is in "Testing" mode, ensure your Google account is added as a test user
   - If your app is in "Production" mode, it might need verification by Google

2. **API Enablement:**
   - Verify that the Google Drive API is enabled for your project
   - Go to "APIs & Services" > "Library", search for "Google Drive API" and ensure it shows "API Enabled"

3. **Scope Configuration:**
   - Make sure the scopes you're requesting match what's configured in the OAuth consent screen
   - In the OAuth consent screen, check that you've added both:
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/drive.metadata.readonly`

4. **Browser Issues:**
   - Clear your browser cookies and cache for google.com domains
   - Try using an Incognito/Private window for testing

5. **Account Restrictions:**
   - Some Google accounts (especially enterprise/work accounts) may have restrictions
   - Try with a personal Google account if possible

#### "redirect_uri_mismatch" Error

- Make sure your redirect URI is correctly set in the Google Cloud Console
- For local development, add all possible localhost ports (3000-3006)

#### "invalid_client" Error

- Check that your Client ID is correct in the configuration file
- Verify that your OAuth client is configured as "Web application" type

## Additional Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google API Client Library for JavaScript](https://github.com/googleapis/google-api-nodejs-client)
- [Troubleshooting OAuth 2.0 errors](https://developers.google.com/identity/protocols/oauth2/troubleshoot-authorization-errors)
