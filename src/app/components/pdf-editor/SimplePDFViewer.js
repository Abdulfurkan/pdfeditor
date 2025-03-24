'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set worker source directly with a specific version
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

export default function SimplePDFViewer({
  file,
  onDocumentLoadSuccess,
  currentPage,
  numPages,
  scale = 1.0,
  onPageLoadSuccess,
  selectedPages = [],
  togglePageSelection,
  viewType = 'single' // 'single' or 'thumbnails'
}) {
  const [error, setError] = useState(null);

  const handleLoadSuccess = (pdf) => {
    if (onDocumentLoadSuccess) {
      onDocumentLoadSuccess(pdf);
    }
  };

  const handleLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF. Please try a different file.');
  };

  const handlePageSuccess = (page) => {
    if (onPageLoadSuccess) {
      onPageLoadSuccess(page);
    }
  };

  if (error) {
    return <div className="text-red-500 p-4" data-component-name="SimplePDFViewer">{error}</div>;
  }

  return (
    <Document
      file={file}
      onLoadSuccess={handleLoadSuccess}
      onLoadError={handleLoadError}
      className={viewType === 'thumbnails' ? 'thumbnail-document' : ''}
      options={{
        cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
        cMapPacked: true,
      }}
      loading={
        <div className="text-blue-500 p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
          Loading PDF...
        </div>
      }
    >
      {viewType === 'thumbnails' ? (
        // Render thumbnails
        Array.from(new Array(numPages || 0), (_, index) => (
          <div 
            key={`thumbnail-${index + 1}`}
            className={`mb-3 cursor-pointer border-2 ${
              selectedPages.includes(index + 1) ? 'border-blue-500' : 'border-transparent'
            }`}
            onClick={() => togglePageSelection && togglePageSelection(index + 1)}
          >
            <Page 
              key={`page_${index + 1}`}
              pageNumber={index + 1} 
              width={150}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
            <div className="text-center text-sm mt-1">Page {index + 1}</div>
          </div>
        ))
      ) : (
        // Render single page
        <Page 
          pageNumber={currentPage} 
          scale={scale}
          onLoadSuccess={handlePageSuccess}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      )}
    </Document>
  );
}
