'use client';

import { useState, useEffect } from 'react';

export default function IframePDFViewer({
  file,
  onDocumentLoadSuccess,
  currentPage,
  numPages,
  scale = 1.0,
  onPageLoadSuccess,
  selectedPages = [],
  togglePageSelection,
  viewType = 'single'
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (file) {
      setLoading(true);
      setError(null);
      
      // Simulate document load success with a fixed number of pages
      // In a real implementation, you would get this from the PDF
      if (onDocumentLoadSuccess) {
        // Use setTimeout to simulate async loading
        setTimeout(() => {
          onDocumentLoadSuccess({ numPages: 1 });
          setLoading(false);
        }, 500);
      }
    }
  }, [file, onDocumentLoadSuccess]);

  if (error) {
    return (
      <div className="text-red-500 p-4 border border-red-300 rounded">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2">Loading PDF...</p>
      </div>
    );
  }

  return (
    <div className="pdf-container">
      <iframe
        src={file}
        className="w-full"
        style={{ 
          height: '600px',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}
        title="PDF Viewer"
      />
    </div>
  );
}
