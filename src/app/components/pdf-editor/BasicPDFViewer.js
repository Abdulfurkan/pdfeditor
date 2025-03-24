'use client';

import { useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { pdfjs } from 'react-pdf';

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function BasicPDFViewer({
  file,
  onDocumentLoadSuccess,
  currentPage = 1,
  numPages,
  scale = 1.0,
  onPageLoadSuccess,
  selectedPages = [],
  togglePageSelection,
  viewType = 'single'
}) {
  const [errorMessage, setErrorMessage] = useState(null);
  const [documentLoaded, setDocumentLoaded] = useState(false);

  const handleDocumentLoadSuccess = (pdf) => {
    console.log('PDF loaded successfully');
    setDocumentLoaded(true);
    if (onDocumentLoadSuccess) {
      onDocumentLoadSuccess(pdf);
    }
  };

  const handleDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setErrorMessage('Failed to load PDF. Please try a different file.');
  };

  const handlePageLoadSuccess = (page) => {
    if (onPageLoadSuccess) {
      onPageLoadSuccess(page);
    }
  };

  if (errorMessage) {
    return (
      <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="pdf-container">
      <Document
        file={file}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleDocumentLoadError}
        loading={
          <div className="text-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Loading PDF...</p>
          </div>
        }
        noData={<p>No PDF file selected.</p>}
        options={{
          cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
          cMapPacked: true,
        }}
      >
        {documentLoaded && viewType === 'thumbnails' && numPages > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from(new Array(numPages), (_, index) => (
              <div
                key={`thumbnail-${index + 1}`}
                className={`cursor-pointer border-2 p-1 ${
                  selectedPages.includes(index + 1) ? 'border-blue-500' : 'border-gray-300'
                }`}
                onClick={() => togglePageSelection && togglePageSelection(index + 1)}
              >
                <Page
                  pageNumber={index + 1}
                  width={150}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
                <p className="text-center text-sm mt-1">Page {index + 1}</p>
              </div>
            ))}
          </div>
        ) : documentLoaded && currentPage && currentPage <= numPages ? (
          <Page
            pageNumber={currentPage}
            scale={scale}
            onLoadSuccess={handlePageLoadSuccess}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        ) : (
          <div className="text-center p-4">
            <p>Preparing document for viewing...</p>
          </div>
        )}
      </Document>
    </div>
  );
}
