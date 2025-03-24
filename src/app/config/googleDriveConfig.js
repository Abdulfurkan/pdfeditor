'use client';

// Helper function to safely get window.location.origin
const getRedirectUri = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.origin;
};

// Google API credentials
export const GOOGLE_DRIVE_CONFIG = {
  // Your OAuth client ID
  CLIENT_ID: '471357891901-ld4kbcu5o311pdg1j5n4scmgd73mgdce.apps.googleusercontent.com',
  // We don't use the client secret in client-side code for security reasons
  CLIENT_SECRET: '', 
  // Optional: API key for unauthenticated requests (not required for OAuth flow)
  API_KEY: '',
  // Scopes define what permissions we're requesting
  SCOPES: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ],
  REDIRECT_URI: getRedirectUri()
};

// IMPORTANT SECURITY NOTE:
// Client secrets should NOT be exposed in client-side code.
// For this browser-based implementation, we're using the Google Identity Services API
// which doesn't require the client secret for authentication.

// Instructions for setting up Google Cloud Project:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project or select your existing project
// 3. Enable the Google Drive API:
//    - Go to "APIs & Services" > "Library"
//    - Search for "Google Drive API"
//    - Click on it and click "Enable"
// 4. Create OAuth 2.0 credentials:
//    - Go to "APIs & Services" > "Credentials"
//    - Click "Create Credentials" > "OAuth client ID"
//    - Select "Web application" as the application type
//    - Add your domain to authorized JavaScript origins
//      - For development: http://localhost:3000, http://localhost:3001, etc.
//      - For production: your actual domain (e.g., https://yourdomain.com)
//    - No need to add redirect URIs when using Google Identity Services API
// 5. Configure OAuth consent screen:
//    - Go to "APIs & Services" > "OAuth consent screen"
//    - Choose "External" user type (unless you have a Google Workspace)
//    - Fill in the required app information
//    - Add the scopes you need (drive.readonly and drive.metadata.readonly)
//    - Add test users if your app is still in testing mode
// 6. Copy the Client ID to this file
//
// TROUBLESHOOTING:
// If you see "Error 403: access_denied" error:
// 1. Check your OAuth consent screen configuration:
//    - Make sure your app is properly configured
//    - If your app is in "Testing" mode, make sure your Google account is added as a test user
//    - If your app is in "Production" mode, it might need verification by Google
// 2. Verify that the Google Drive API is enabled for your project
// 3. Make sure the scopes you're requesting match what's configured in the OAuth consent screen
// 4. Clear your browser cookies and cache for google.com domains
// 5. Try using an Incognito/Private window to test
// 6. Check if your Google account has restrictions (e.g., enterprise accounts might have restrictions)
