'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  listPdfFiles, 
  signInWithGoogle,
  downloadFile,
  isSignedIn,
  signOutFromGoogle
} from '../../services/googleDriveService';

const GoogleDrivePicker = ({ onFileSelected, onClose }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        setAuthError(false);
        
        try {
          // Attempt to sign in and get files in one step
          const pdfFiles = await listPdfFiles();
          setFiles(pdfFiles || []);
        } catch (authErr) {
          console.error("Authentication error:", authErr);
          setAuthError(true);
          setError("Failed to authenticate with Google. Please check your Google Cloud Console settings and ensure your OAuth credentials are properly configured.");
        }
      } catch (error) {
        console.error('Error fetching files:', error);
        setError('Failed to fetch files from Google Drive. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const handleRetryAuth = async () => {
    setLoading(true);
    setError(null);
    setAuthError(false);
    
    try {
      // Sign out first to clear any existing tokens
      await signOutFromGoogle().catch(() => {});
      
      // Try to get files again
      const pdfFiles = await listPdfFiles();
      setFiles(pdfFiles || []);
    } catch (error) {
      console.error('Error during retry authentication:', error);
      setError('Authentication failed. Please check your Google Cloud Console settings.');
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file) => {
    try {
      setSelectedFile(file);
      setDownloading(true);
      
      // Download the file
      const fileData = await downloadFile(file.id);
      
      if (fileData && fileData.blob) {
        // Create a File object from the Blob
        const pdfFile = new File([fileData.blob], file.name, { type: 'application/pdf' });
        
        // Pass the file to the parent component
        onFileSelected(pdfFile);
        
        // Close the picker
        onClose();
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download the file. Please try again.');
      setDownloading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutFromGoogle();
      setFiles([]);
      setLoading(true);
      
      // Try to get files again (will trigger sign in)
      const pdfFiles = await listPdfFiles();
      setFiles(pdfFiles || []);
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden" style={{ width: '90vw', maxWidth: '800px', maxHeight: '80vh' }}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">Select a PDF from Google Drive</h2>
        <div className="flex space-x-2">
          {!authError && (
            <button 
              onClick={handleSignOut}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Sign Out
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 130px)' }}>
        {loading && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading files from Google Drive...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
            
            {authError && (
              <div className="mt-4">
                <p className="font-medium">Troubleshooting steps:</p>
                <ol className="list-decimal ml-5 mt-2">
                  <li>Verify that your Google Cloud project has the Google Drive API enabled</li>
                  <li>Check that your OAuth client ID is correct</li>
                  <li>Make sure your OAuth client is configured as a "Web application" (not Desktop)</li>
                  <li>Make sure you've added the following to Authorized JavaScript Origins in Google Cloud Console:
                    <ul className="list-disc ml-5 mt-1">
                      <li>http://localhost:3000</li>
                      <li>http://localhost:3001</li>
                      <li>http://localhost:3002</li>
                      <li>http://localhost:3003</li>
                      <li>http://localhost:3004</li>
                      <li>http://localhost:3005</li>
                    </ul>
                  </li>
                  <li>Clear your browser cookies for google.com domains</li>
                  <li>Try using an Incognito/Private window</li>
                </ol>
                
                <button 
                  onClick={handleRetryAuth}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Retry Authentication
                </button>
              </div>
            )}
          </div>
        )}
        
        {!loading && !error && files.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-600">No PDF files found in your Google Drive.</p>
          </div>
        )}
        
        {!loading && !error && files.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <div 
                key={file.id}
                onClick={() => !downloading && handleFileSelect(file)}
                className={`border rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-colors ${selectedFile && selectedFile.id === file.id ? 'border-blue-500 bg-blue-50' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 mb-2 flex items-center justify-center">
                    {file.thumbnailLink ? (
                      <img src={file.thumbnailLink} alt={file.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-center truncate w-full">{file.name}</p>
                </div>
                
                {selectedFile && selectedFile.id === file.id && downloading && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="border-t p-4 flex justify-end">
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded mr-2 hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default GoogleDrivePicker;
