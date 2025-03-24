'use client';

import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set up PDF.js worker with a specific version that matches react-pdf
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

export default function PDFViewer({
  file,
  onDocumentLoadSuccess,
  currentPage,
  numPages,
  scale,
  onPageLoadSuccess,
  selectedPages = [],
  togglePageSelection,
  viewType = 'single' // 'single' or 'thumbnails'
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle document load success
  const handleDocumentLoadSuccess = (pdf) => {
    setLoading(false);
    if (onDocumentLoadSuccess) {
      onDocumentLoadSuccess(pdf);
    }
  };

  // Handle document load error
  const handleDocumentLoadError = (err) => {
    console.error('Error loading PDF:', err);
    setLoading(false);
    setError('Failed to load PDF. Please try a different file.');
  };

  // Handle page load success
  const handlePageLoadSuccess = (page) => {
    if (onPageLoadSuccess) {
      onPageLoadSuccess(page);
    }
  };

  // Render thumbnails view
  const renderThumbnails = () => {
    if (!numPages) return null;
    
    return Array.from(new Array(numPages), (_, index) => (
      <div 
        key={`thumbnail-${index + 1}`}
        className={`mb-3 cursor-pointer border-2 ${
          selectedPages.includes(index + 1) ? 'border-blue-500' : 'border-transparent'
        }`}
        onClick={() => togglePageSelection && togglePageSelection(index + 1)}
      >
        <Page 
          pageNumber={index + 1} 
          width={150}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
        <div className="text-center text-sm mt-1">Page {index + 1}</div>
      </div>
    ));
  };

  // Render single page view
  const renderSinglePage = () => {
    return (
      <Page 
        pageNumber={currentPage} 
        scale={scale}
        onLoadSuccess={handlePageLoadSuccess}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
    );
  };

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (loading) {
    return <div className="text-blue-500 p-4 flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
      Loading PDF...
    </div>;
  }

  return (
    <Document
      file={file}
      onLoadSuccess={handleDocumentLoadSuccess}
      onLoadError={handleDocumentLoadError}
      className={viewType === 'thumbnails' ? 'thumbnail-document' : ''}
      options={{
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
      }}
      error={<div className="text-red-500 p-4">Failed to load PDF. Please try a different file.</div>}
      noData={<div className="text-gray-500 p-4">No PDF file selected.</div>}
      loading={<div className="text-blue-500 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
        Loading PDF...
      </div>}
    >
      {viewType === 'thumbnails' ? renderThumbnails() : renderSinglePage()}
    </Document>
  );
}
