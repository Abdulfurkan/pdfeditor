'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set worker source directly
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function ClientPDFViewer({
  file,
  onLoadSuccess,
  onLoadError,
  currentPage,
  numPages,
  scale,
  onPageLoadSuccess,
  selectedPages = [],
  togglePageSelection,
  viewType = 'single', // 'single', 'thumbnails', or 'grid'
  onMouseDown,
  onMouseMove,
  onMouseUp,
  cursorStyle
}) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [documentLoaded, setDocumentLoaded] = useState(false);

  // Use an iframe as a fallback if react-pdf fails
  const [useIframe, setUseIframe] = useState(false);

  useEffect(() => {
    // Reset state when file changes
    setError(null);
    setLoading(true);
    setDocumentLoaded(false);
    setUseIframe(false);
  }, [file]);

  const handleLoadSuccess = (pdf) => {
    console.log('PDF loaded successfully with', pdf.numPages, 'pages');
    setLoading(false);
    setDocumentLoaded(true);
    if (onLoadSuccess) {
      onLoadSuccess(pdf);
    }
  };

  const handleLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF. Please try again or use a different file.');
    setLoading(false);

    // Try using iframe as fallback
    setUseIframe(true);

    // Pass the error to the parent component
    if (onLoadError) {
      onLoadError(error);
    }
  };

  const handlePageSuccess = (page) => {
    if (onPageLoadSuccess) {
      onPageLoadSuccess(page);
    }
  };

  // Handle mouse events for cropping
  const handleMouseEvents = (e) => {
    if (onMouseDown || onMouseMove || onMouseUp) {
      // Prevent default behavior to avoid text selection
      e.preventDefault();

      // Pass the event to the parent component
      if (e.type === 'mousedown' && onMouseDown) {
        console.log('ClientPDFViewer: mousedown event');
        onMouseDown(e);
      } else if (e.type === 'mousemove' && onMouseMove) {
        onMouseMove(e);
      } else if (e.type === 'mouseup' && onMouseUp) {
        console.log('ClientPDFViewer: mouseup event');
        onMouseUp(e);
      }
    }
  };

  if (useIframe) {
    return (
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
    );
  }

  if (error && !useIframe) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <Document
      file={file}
      onLoadSuccess={handleLoadSuccess}
      onLoadError={handleLoadError}
      className={viewType === 'thumbnails' ? 'thumbnail-document' : 'w-full h-full flex justify-center items-center m-0 p-0'}
      loading={
        <div className="text-blue-500 p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
          Loading PDF...
        </div>
      }
    >
      {documentLoaded && viewType === 'grid' && numPages > 0 ? (
        // Grid view for PDFRemover
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {Array.from(new Array(numPages), (_, index) => (
            <div
              key={`page-${index + 1}`}
              className={`border border-gray-300 rounded-md overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${selectedPages.includes(index + 1) ? 'border-2 border-red-500' : ''
                }`}
              onClick={() => togglePageSelection && togglePageSelection(index + 1)}
            >
              <div className="relative flex justify-center items-center p-4 bg-white min-h-[300px]">
                <Page
                  pageNumber={index + 1}
                  scale={1.2}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  width={240}
                />
                {selectedPages.includes(index + 1) && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </div>
                )}
              </div>
              <div className="text-center py-2 bg-gray-50 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-800">Page {index + 1}</p>
              </div>
            </div>
          ))}
        </div>
      ) : documentLoaded && viewType === 'thumbnails' && numPages > 0 ? (
        // Render thumbnails
        Array.from(new Array(numPages), (_, index) => (
          <div
            key={`thumbnail-${index + 1}`}
            className={`mb-3 cursor-pointer border-2 ${selectedPages.includes(index + 1) ? 'border-blue-500' : 'border-transparent'
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
            <div className="text-center text-sm mt-1 text-gray-800 font-medium">Page {index + 1}</div>
          </div>
        ))
      ) : documentLoaded && currentPage && currentPage <= numPages ? (
        // Render single page
        <div className="flex justify-center items-center w-full h-full m-0 p-0">
          <Page
            pageNumber={currentPage}
            scale={scale}
            onLoadSuccess={handlePageSuccess}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onMouseDown={(e) => handleMouseEvents(e)}
            onMouseMove={(e) => handleMouseEvents(e)}
            onMouseUp={(e) => handleMouseEvents(e)}
            className={`m-0 p-0 ${cursorStyle ? `cursor-${cursorStyle}` : ''}`}
            width={null} // Remove fixed width to maintain aspect ratio
          />
        </div>
      ) : (
        <div className="text-center p-4">
          <p>Preparing document for viewing...</p>
        </div>
      )}
    </Document>
  );
}
