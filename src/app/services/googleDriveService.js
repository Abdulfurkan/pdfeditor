'use client';

import { GOOGLE_DRIVE_CONFIG } from '../config/googleDriveConfig';

// Load the Google Identity Services API
const loadGoogleIdentityApi = () => {
  return new Promise((resolve, reject) => {
    // Check if the API is already loaded
    if (window.google && window.google.accounts) {
      resolve(window.google.accounts);
      return;
    }

    // Create script element to load the Google Identity API
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && window.google.accounts) {
        console.log('Google Identity API loaded successfully');
        resolve(window.google.accounts);
      } else {
        console.error('Failed to load Google Identity API');
        reject(new Error('Failed to load Google Identity API'));
      }
    };
    script.onerror = (error) => {
      console.error('Error loading Google Identity API:', error);
      reject(error);
    };
    document.body.appendChild(script);
  });
};

// Load the Google API client library
const loadGoogleApiClient = () => {
  return new Promise((resolve, reject) => {
    // Check if the API is already loaded
    if (window.gapi && window.gapi.client) {
      resolve(window.gapi);
      return;
    }

    // Create script element to load the Google API
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load('client', () => {
        window.gapi.client.init({
          apiKey: GOOGLE_DRIVE_CONFIG.API_KEY,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        }).then(() => {
          console.log('Google API client initialized successfully');
          resolve(window.gapi);
        }).catch(error => {
          console.error('Error initializing Google API client:', error);
          reject(error);
        });
      });
    };
    script.onerror = (error) => {
      console.error('Error loading Google API:', error);
      reject(error);
    };
    document.body.appendChild(script);
  });
};

// Store the access token
let accessToken = null;

// Sign in the user using a popup window
export const signInWithGoogle = async () => {
  try {
    console.log('Attempting to sign in with Google using popup');
    
    // Load both APIs in parallel
    const [googleAccounts, gapi] = await Promise.all([
      loadGoogleIdentityApi(),
      loadGoogleApiClient()
    ]);
    
    return new Promise((resolve, reject) => {
      // Configure the token client
      const tokenClient = googleAccounts.oauth2.initTokenClient({
        client_id: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
        scope: GOOGLE_DRIVE_CONFIG.SCOPES.join(' '),
        prompt: 'consent',
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Error during token response:', tokenResponse);
            reject(new Error(`Authentication failed: ${tokenResponse.error}`));
            return;
          }
          
          console.log('Successfully obtained access token');
          accessToken = tokenResponse.access_token;
          
          // Set the token for the API client
          gapi.client.setToken({ access_token: accessToken });
          
          resolve(tokenResponse);
        },
      });
      
      // Request an access token
      tokenClient.requestAccessToken();
    });
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Check if user is signed in
export const isSignedIn = async () => {
  return !!accessToken;
};

// Sign out the user
export const signOutFromGoogle = async () => {
  if (accessToken && window.google && window.google.accounts) {
    window.google.accounts.oauth2.revoke(accessToken, () => {
      console.log('Access token revoked');
    });
  }
  
  accessToken = null;
  return true;
};

// List PDF files from Google Drive
export const listPdfFiles = async () => {
  try {
    // Ensure we have an access token
    if (!accessToken) {
      await signInWithGoogle();
    }
    
    // Make sure the Google API client is loaded
    const gapi = await loadGoogleApiClient();
    
    // Set the access token for the API client
    gapi.client.setToken({ access_token: accessToken });
    
    // List files
    console.log('Fetching PDF files from Google Drive');
    const response = await gapi.client.drive.files.list({
      q: "mimeType='application/pdf'",
      fields: 'files(id, name, webContentLink, iconLink, thumbnailLink)',
      spaces: 'drive',
      pageSize: 50
    });
    
    console.log('PDF files fetched successfully:', response.result.files.length);
    return response.result.files;
  } catch (error) {
    console.error('Error listing PDF files:', error);
    
    // If the error is related to authentication, try to re-authenticate
    if (error.status === 401 || error.status === 403) {
      console.log('Authentication error, trying to re-authenticate');
      accessToken = null;
      await signInWithGoogle();
      return listPdfFiles();
    }
    
    throw error;
  }
};

// Download a file from Google Drive
export const downloadFile = async (fileId) => {
  try {
    // Ensure we have an access token
    if (!accessToken) {
      await signInWithGoogle();
    }
    
    // Use fetch API to download the file
    console.log('Downloading file with ID:', fileId);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    // Get file as blob
    const blob = await response.blob();
    console.log('File downloaded successfully');
    
    return {
      blob,
      url: URL.createObjectURL(blob)
    };
  } catch (error) {
    console.error('Error downloading file:', error);
    
    // If the error is related to authentication, try to re-authenticate
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('Authentication error, trying to re-authenticate');
      accessToken = null;
      await signInWithGoogle();
      return downloadFile(fileId);
    }
    
    throw error;
  }
};
