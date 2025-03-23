'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { PDFDocument } from 'pdf-lib';
import AdSpace from '../ads/AdSpace';

// Dynamically import ClientPDFViewer with no SSR
const ClientPDFViewer = dynamic(
  () => import('./ClientPDFViewer'),
  { ssr: false }
);

export default function PDFEditor({ file, onReset }) {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const [selectedPages, setSelectedPages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfFile, setPdfFile] = useState(file);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [cropDimensions, setCropDimensions] = useState(null);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [moveStart, setMoveStart] = useState({ x: 0, y: 0 });
  const [cropApplied, setCropApplied] = useState(false);
  const [cropAllPages, setCropAllPages] = useState(true); // Default to true
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState(null);
  const [croppedPdfData, setCroppedPdfData] = useState(null);
  const [croppedPdfSize, setCroppedPdfSize] = useState(0);
  const [showCroppedPreview, setShowCroppedPreview] = useState(false);
  const [croppedPdfLoaded, setCroppedPdfLoaded] = useState(false); // Track if cropped PDF is loaded
  const [isLoading, setIsLoading] = useState(true);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 });
  const [selectionLocked, setSelectionLocked] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [paperFormat, setPaperFormat] = useState('Unknown');
  const [currentCroppedPage, setCurrentCroppedPage] = useState(1); // Track current page in cropped preview

  // Update pdfFile when file prop changes
  useEffect(() => {
    if (file && file.url) {
      setPdfFile(file);
      setCropApplied(false);
    }
  }, [file]);

  const cropStartRef = useRef(null);
  const cropAreaRef = useRef(null);
  const canvasRef = useRef(null);

  // Document load success handler
  const onDocumentLoadSuccess = (pdf) => {
    console.log('Document loaded successfully with', pdf.numPages, 'pages');
    setNumPages(pdf.numPages);
    setCurrentPage(1);
    setIsLoading(false);

    // Reset selected pages
    setSelectedPages([]);

    // Get the first page to determine page size
    if (pdf.getPage) {
      pdf.getPage(1).then(page => {
        const viewport = page.getViewport({ scale: 1.0 });
        setPageSize({ width: viewport.width, height: viewport.height });

        // Determine paper format based on dimensions (in points)
        const paperSize = determinePaperFormat(viewport.width, viewport.height);
        setPaperFormat(paperSize);
      }).catch(err => {
        console.error('Error getting page:', err);
      });
    } else {
      console.log('pdf.getPage is not available, skipping page size detection');
    }
  };

  // Function to determine paper format based on dimensions
  const determinePaperFormat = (width, height) => {
    // Standard paper sizes in points (72 points = 1 inch)
    const paperSizes = {
      'A4': { width: 595, height: 842 },
      'A3': { width: 842, height: 1191 },
      'A5': { width: 420, height: 595 },
      'Letter': { width: 612, height: 792 },
      'Legal': { width: 612, height: 1008 },
      'Tabloid': { width: 792, height: 1224 }
    };

    // Allow for some tolerance in dimensions (±5 points)
    const tolerance = 5;

    // Check both portrait and landscape orientations
    for (const [format, dimensions] of Object.entries(paperSizes)) {
      if (
        (Math.abs(width - dimensions.width) <= tolerance &&
          Math.abs(height - dimensions.height) <= tolerance) ||
        (Math.abs(width - dimensions.height) <= tolerance &&
          Math.abs(height - dimensions.width) <= tolerance)
      ) {
        const orientation = width > height ? 'Landscape' : 'Portrait';
        return `${format} (${orientation})`;
      }
    }

    // If no standard size matches, return custom dimensions
    return `Custom (${Math.round(width)} × ${Math.round(height)} pts)`;
  };

  // Handle page rendering success
  function onPageLoadSuccess(page) {
    const viewport = page.getViewport({ scale: 1.0 });

    // Store the actual PDF page dimensions
    setPageSize({
      width: viewport.width,
      height: viewport.height
    });

    // Initialize crop area to full page
    setCropArea({
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height
    });

    // Log page dimensions for debugging
    console.log(`Page dimensions: ${viewport.width} x ${viewport.height}`);

    // We're no longer resetting crop state when a new page is loaded
    // This allows users to navigate between pages while maintaining their crop selection
  }

  // Toggle cropping mode
  const toggleCropping = () => {
    // Enable cropping mode to change cursor
    console.log("Toggling crop mode");
    setIsCropping(!isCropping);

    // Clear previous crop dimensions when entering crop mode
    if (!isCropping) {
      setCropStart(null);
      setCropEnd(null);
      setCropDimensions(null);
      setSelectionLocked(false);
    }

    // Apply cursor style to PageCanvas elements
    setTimeout(() => {
      const canvasElements = document.querySelectorAll('.react-pdf__Page__canvas');
      canvasElements.forEach(canvas => {
        canvas.style.cursor = !isCropping ? 'crosshair' : 'default';
      });
    }, 50);

    return;
  };

  // Cancel crop
  const cancelCrop = () => {
    // Disable cropping mode
    console.log("Canceling crop");
    setIsCropping(false);

    // Clear crop dimensions
    setCropStart(null);
    setCropEnd(null);
    setCropDimensions(null);
    setSelectionLocked(false);

    // Reset cursor style on PageCanvas elements
    const canvasElements = document.querySelectorAll('.react-pdf__Page__canvas');
    canvasElements.forEach(canvas => {
      canvas.style.cursor = 'default';
    });

    return;
  };

  // Adjust crop (when selection is locked)
  const adjustCrop = () => {
    // Just toggle selection locked state to allow adjustment
    setSelectionLocked(false);
    return;
  };

  // Handle mouse events for cropping
  const handleMouseDown = (e) => {
    if (!isCropping || !pdfFile) return;

    // Get page container for positioning
    const pageContainer = e.currentTarget;
    const rect = pageContainer.getBoundingClientRect();

    // Calculate position relative to the page container
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    // Check if we're clicking on a handle or inside the selection
    if (cropDimensions && selectionLocked) {
      const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = cropDimensions;

      // Define handle regions (corners and edges)
      const handleSize = 10;
      const handles = {
        topLeft: { x: cropX - handleSize / 2, y: cropY - handleSize / 2, width: handleSize, height: handleSize },
        topRight: { x: cropX + cropWidth - handleSize / 2, y: cropY - handleSize / 2, width: handleSize, height: handleSize },
        bottomLeft: { x: cropX - handleSize / 2, y: cropY + cropHeight - handleSize / 2, width: handleSize, height: handleSize },
        bottomRight: { x: cropX + cropWidth - handleSize / 2, y: cropY + cropHeight - handleSize / 2, width: handleSize, height: handleSize },
        top: { x: cropX + cropWidth / 2 - handleSize / 2, y: cropY - handleSize / 2, width: handleSize, height: handleSize },
        right: { x: cropX + cropWidth - handleSize / 2, y: cropY + cropHeight / 2 - handleSize / 2, width: handleSize, height: handleSize },
        bottom: { x: cropX + cropWidth / 2 - handleSize / 2, y: cropY + cropHeight - handleSize / 2, width: handleSize, height: handleSize },
        left: { x: cropX - handleSize / 2, y: cropY + cropHeight / 2 - handleSize / 2, width: handleSize, height: handleSize }
      };

      // Check if clicking on a handle
      for (const [handleName, handleRect] of Object.entries(handles)) {
        if (
          x >= handleRect.x &&
          x <= handleRect.x + handleRect.width &&
          y >= handleRect.y &&
          y <= handleRect.y + handleRect.height
        ) {
          setActiveHandle(handleName);
          setIsDragging(true);
          return;
        }
      }

      // Check if clicking inside the crop area (for moving)
      if (
        x >= cropX &&
        x <= cropX + cropWidth &&
        y >= cropY &&
        y <= cropY + cropHeight
      ) {
        setActiveHandle('move');
        setIsDragging(true);
        setCropStart({ x, y });
        return;
      }
    }

    // Start a new selection
    setSelectionLocked(false);
    setActiveHandle(null);
    setIsDragging(true);
    setCropStart({ x, y });
    setCropEnd({ x, y });
    setCropDimensions({
      x,
      y,
      width: 0,
      height: 0
    });
  };

  const handleMouseMove = (e) => {
    if (!isCropping || !isDragging || !pdfFile) return;

    // Get page container for positioning
    const pageContainer = e.currentTarget;
    const rect = pageContainer.getBoundingClientRect();

    // Calculate position relative to the page container
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    if (activeHandle) {
      // Resize or move the existing selection
      const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = cropDimensions;

      let newX = cropX;
      let newY = cropY;
      let newWidth = cropWidth;
      let newHeight = cropHeight;

      switch (activeHandle) {
        case 'topLeft':
          newX = x;
          newY = y;
          newWidth = cropWidth + (cropX - x);
          newHeight = cropHeight + (cropY - y);
          break;
        case 'topRight':
          newY = y;
          newWidth = x - cropX;
          newHeight = cropHeight + (cropY - y);
          break;
        case 'bottomLeft':
          newX = x;
          newWidth = cropWidth + (cropX - x);
          newHeight = y - cropY;
          break;
        case 'bottomRight':
          newWidth = x - cropX;
          newHeight = y - cropY;
          break;
        case 'top':
          newY = y;
          newHeight = cropHeight + (cropY - y);
          break;
        case 'right':
          newWidth = x - cropX;
          break;
        case 'bottom':
          newHeight = y - cropY;
          break;
        case 'left':
          newX = x;
          newWidth = cropWidth + (cropX - x);
          break;
        case 'move':
          if (cropStart) {
            const diffX = x - cropStart.x;
            const diffY = y - cropStart.y;
            newX = cropX + diffX;
            newY = cropY + diffY;
            setCropStart({ x, y });
          }
          break;
      }

      // Ensure width and height are not negative
      if (newWidth < 0) {
        newX = newX + newWidth;
        newWidth = Math.abs(newWidth);
      }

      if (newHeight < 0) {
        newY = newY + newHeight;
        newHeight = Math.abs(newHeight);
      }

      // Constrain to page boundaries
      newX = Math.max(0, Math.min(newX, rect.width - newWidth));
      newY = Math.max(0, Math.min(newY, rect.height - newHeight));

      setCropDimensions({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      });
    } else {
      // Update the end point of the new selection
      setCropEnd({ x, y });

      // Calculate dimensions
      const width = Math.abs(x - cropStart.x);
      const height = Math.abs(y - cropStart.y);
      const cropX = Math.min(cropStart.x, x);
      const cropY = Math.min(cropStart.y, y);

      setCropDimensions({
        x: cropX,
        y: cropY,
        width,
        height
      });
    }
  };

  const handleMouseUp = () => {
    if (!isCropping) return;

    setIsDragging(false);
    setActiveHandle(null);

    // Lock the selection if it has a valid size
    if (cropDimensions && cropDimensions.width > 10 && cropDimensions.height > 10) {
      setSelectionLocked(true);
    }
  };

  // Convert pixel dimensions to points (PDF units)
  const pixelsToPoints = (pixels, scale) => {
    // Standard PDF point is 1/72 of an inch
    // Assuming screen DPI of 96, the conversion is approximately pixels * 72/96
    return (pixels / scale) * (72 / 96);
  };

  // Download the cropped PDF
  const downloadCroppedPDF = () => {
    if (!croppedPdfData || !croppedPdfData.url) {
      console.error("No cropped PDF data available for download");
      return;
    }

    console.log("Downloading cropped PDF:", croppedPdfData);
    const link = document.createElement('a');
    link.href = croppedPdfData.url;
    link.download = croppedPdfData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Close cropped preview and return to editor
  const closeCroppedPreview = () => {
    setShowCroppedPreview(false);
    setCroppedPdfLoaded(false);
  };

  // Download the original PDF
  const downloadPDF = () => {
    if (!pdfFile) return;

    // Create a download link
    const link = document.createElement('a');

    // Use cropped PDF if available, otherwise use original
    if (cropApplied && croppedPdfData) {
      link.href = croppedPdfData.url;
      link.download = croppedPdfData.name;
    } else {
      link.href = pdfFile.url;
      link.download = `${pdfFile.name || 'document.pdf'}`;
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle page selection
  const togglePageSelection = (pageNum) => {
    setSelectedPages(prev => {
      if (prev.includes(pageNum)) {
        return prev.filter(p => p !== pageNum);
      } else {
        return [...prev, pageNum].sort((a, b) => a - b);
      }
    });
  };

  // Remove selected pages
  const removePages = async () => {
    if (!pdfFile || selectedPages.length === 0 || selectedPages.length === numPages) {
      alert('Please select at least one page to remove, but not all pages.');
      return;
    }

    setIsProcessing(true);

    try {
      // Load the PDF
      const arrayBuffer = await pdfFile.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Get the pages to keep (all pages except the selected ones)
      const pagesToKeep = Array.from({ length: numPages }, (_, i) => i + 1)
        .filter(pageNum => !selectedPages.includes(pageNum));

      // Create a new PDF with only the pages to keep
      const newPdfDoc = await PDFDocument.create();

      // Copy pages from the original to the new document
      for (const pageNum of pagesToKeep) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1]);
        newPdfDoc.addPage(copiedPage);
      }

      // Save the modified PDF
      const modifiedPdfBytes = await newPdfDoc.save();

      // Create a new Blob and URL
      const modifiedPdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const modifiedPdfUrl = URL.createObjectURL(modifiedPdfBlob);

      // Update the PDF in the parent component
      onFileSelected({
        file: modifiedPdfBlob,
        url: modifiedPdfUrl
      });

    } catch (error) {
      console.error('Error removing pages:', error);
      alert('An error occurred while removing pages. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to pass the modified file back to the parent
  const onFileSelected = (newFile) => {
    // Clean up the old URL to prevent memory leaks
    if (pdfFile && pdfFile.url) {
      URL.revokeObjectURL(pdfFile.url);
    }

    // Reset state for the new file
    setCurrentPage(1);
    setIsCropping(false);

    // Update the file
    onReset();
    // Use a timeout to ensure the component is fully reset before setting the new file
    setTimeout(() => {
      setPdfFile(newFile);
    }, 100);
  };

  // Helper function to determine cursor style based on current state
  const handleReset = () => {
    if (onReset) {
      onReset();
    }
    setCropApplied(false);
  };

  // Apply crop to PDF
  const applyCrop = async () => {
    if (!cropDimensions || !pdfFile) return;

    // Set processing state
    setIsProcessing(true);
    setCroppedPdfLoaded(false);

    try {
      console.log("Starting crop process with dimensions:", cropDimensions);

      // Load the PDF document
      const arrayBuffer = await pdfFile.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Create a new PDF document for the cropped result
      const croppedPdfDoc = await PDFDocument.create();

      // Determine which pages to crop
      const pagesToCrop = cropAllPages
        ? Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i)
        : [currentPage - 1];

      console.log("Cropping pages:", pagesToCrop);

      // For each page to crop
      for (const pageIndex of pagesToCrop) {
        // Get the original page
        const [copiedPage] = await croppedPdfDoc.copyPages(pdfDoc, [pageIndex]);

        // Calculate crop box in PDF points
        const originalPage = pdfDoc.getPage(pageIndex);
        const originalWidth = originalPage.getWidth();
        const originalHeight = originalPage.getHeight();

        console.log("Original PDF dimensions:", { originalWidth, originalHeight });
        console.log("Page size on screen:", pageSize);
        console.log("Current scale:", scale);
        console.log("Crop dimensions on screen:", cropDimensions);

        // Simple direct calculation of crop dimensions
        // Convert from screen pixels to PDF points using the ratio of original PDF size to displayed size
        const xRatio = originalWidth / pageSize.width;
        const yRatio = originalHeight / pageSize.height;

        // Calculate crop coordinates in PDF points
        // Support both horizontal and vertical cropping
        // Apply a larger adjustment to the X coordinate to prevent content from being cut off on the left
        const cropX = Math.max(0, cropDimensions.x * xRatio - 30); // Increase the offset to avoid cutting left content
        // In PDF, Y=0 is at the bottom, so we need to flip the Y coordinate
        const cropY = originalHeight - (cropDimensions.y + cropDimensions.height) * yRatio;
        // Calculate width with a smaller right-side buffer to avoid extra content on the right
        const exactWidth = cropDimensions.width * xRatio;
        const cropWidth = Math.min(originalWidth - cropX, exactWidth - 1); // Further reduced buffer for right side
        const cropHeight = cropDimensions.height * yRatio;

        console.log("Calculated crop box in PDF points:", { cropX, cropY, cropWidth, cropHeight });

        // Set both the crop box and the media box to ensure proper cropping
        // The media box defines the boundaries of the physical medium on which the page is displayed
        copiedPage.setMediaBox(cropX, cropY, cropWidth, cropHeight);
        // The crop box defines the region to which the contents of the page should be clipped
        copiedPage.setCropBox(cropX, cropY, cropWidth, cropHeight);

        // Add the cropped page to the new document
        croppedPdfDoc.addPage(copiedPage);
      }

      // Save the cropped PDF
      const croppedPdfBytes = await croppedPdfDoc.save();
      console.log("Cropped PDF created with size:", croppedPdfBytes.byteLength);

      // Create a blob from the PDF bytes
      const croppedPdfBlob = new Blob([croppedPdfBytes], { type: 'application/pdf' });
      const croppedPdfUrl = URL.createObjectURL(croppedPdfBlob);

      console.log("Created blob URL for cropped PDF:", croppedPdfUrl);

      // Set the cropped PDF data
      const croppedData = {
        file: croppedPdfBlob,
        url: croppedPdfUrl,
        name: `cropped-${pdfFile.name || 'document.pdf'}`,
        size: croppedPdfBlob.size,
        numPages: pagesToCrop.length // Store the number of pages
      };

      console.log("Setting cropped PDF data:", croppedData);
      setCroppedPdfData(croppedData);

      // Set the cropped PDF size
      setCroppedPdfSize(croppedPdfBlob.size);

      // Set crop applied state
      setCropApplied(true);

      // Show the cropped preview instead of auto-downloading
      setShowCroppedPreview(true);

      // Reset current cropped page to 1
      setCurrentCroppedPage(1);

      console.log("Crop applied successfully with dimensions:", cropDimensions);
    } catch (error) {
      console.error("Error applying crop:", error);
      alert("An error occurred while cropping the PDF. Please try again.");
    } finally {
      // End processing state
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-blue-600">PDF Editor</h1>
            <button
              className="text-gray-600 hover:text-blue-600 transition-colors"
              onClick={handleReset}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" />
                </svg>
                Upload New
              </span>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              className={`${cropApplied
                ? 'bg-blue-500 text-white animate-pulse'
                : 'bg-white text-gray-700 hover:bg-gray-100'} 
                text-sm rounded border border-gray-300 px-3 py-1.5 flex items-center transition-colors`}
              onClick={downloadPDF}
              disabled={!pdfFile}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13.4V3.6c0-.89.11-1.6 1-1.6h6c.89 0 1 .71 1 1.6v9.8c0 .89-.11 1.6-1 1.6H4a1 1 0 01-1-1.6z" />
                <path d="M2 6h3" />
                <path d="M14 6h3" />
                <path d="M14 16v-4" />
                <path d="M14 3v4" />
              </svg>
              {cropApplied ? 'Download Cropped PDF' : 'Download'}
            </button>
          </div>
        </div>
      </div>

      {/* Top Ad Banner */}
      <div className="container mx-auto px-4 py-4">
        <AdSpace type="banner" className="mb-4 rounded-lg overflow-hidden shadow-sm" />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-8">
        {showCroppedPreview ? (
          /* Cropped PDF Preview Section */
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left sidebar - Cropped page thumbnails */}
            <div className="w-full lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-24">
                <div className="p-4 border-b border-gray-200 bg-green-50">
                  <h3 className="font-medium text-gray-800">Cropped Pages</h3>
                </div>

                <div className="max-h-[500px] overflow-y-auto p-4 bg-gray-50">
                  {croppedPdfData && (
                    <ClientPDFViewer
                      file={croppedPdfData.url}
                      onLoadSuccess={(pdf) => {
                        console.log("Cropped PDF thumbnails loaded successfully", pdf);
                      }}
                      currentPage={currentCroppedPage}
                      numPages={croppedPdfData.numPages}
                      scale={scale}
                      viewType="thumbnails"
                      selectedPages={[currentCroppedPage]}
                      togglePageSelection={(pageNum) => {
                        setCurrentCroppedPage(pageNum);
                      }}
                    />
                  )}
                </div>

                {/* Left Sidebar Ad */}
                <div className="p-4 border-t border-gray-200">
                  <AdSpace type="box" className="rounded overflow-hidden" />
                </div>
              </div>
            </div>

            {/* Right sidebar - Cropped PDF info */}
            <div className="w-full lg:w-64 flex-shrink-0 order-first lg:order-last">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-24">
                <div className="p-4 border-b border-gray-200 bg-green-50">
                  <h3 className="font-medium text-gray-800">Cropped PDF</h3>
                </div>

                <div className="p-4 space-y-4">
                  {/* Success message */}
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                      </svg>
                      <span className="font-medium text-green-800">Crop Applied Successfully</span>
                    </div>
                    <p className="text-sm text-green-700">Your PDF has been cropped according to your selection.</p>
                  </div>

                  {/* Crop information */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-blue-800">Crop Information</h4>
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Width:</span>
                        <span className="font-medium text-gray-800">{Math.round(pixelsToPoints(cropDimensions?.width || 0, scale))} pt</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Height:</span>
                        <span className="font-medium text-gray-800">{Math.round(pixelsToPoints(cropDimensions?.height || 0, scale))} pt</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pages Cropped:</span>
                        <span className="font-medium text-gray-800">{cropAllPages ? 'All Pages' : 'Current Page'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">File Size:</span>
                        <span className="font-medium text-gray-800">{(croppedPdfSize / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col space-y-2">
                    <button
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      onClick={downloadCroppedPDF}
                    >
                      <span className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                        </svg>
                        Download Cropped PDF
                      </span>
                    </button>
                    <button
                      className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
                      onClick={closeCroppedPreview}
                    >
                      Back to Editor
                    </button>
                  </div>
                </div>

                {/* Left Sidebar Ad */}
                <div className="p-4 border-t border-gray-200">
                  <AdSpace type="box" className="rounded overflow-hidden" />
                </div>
              </div>
            </div>

            {/* Main content - Cropped PDF viewer */}
            <div className="flex-1">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50 p-3 flex justify-between items-center">
                  <h3 className="font-medium text-gray-800">Cropped PDF Preview</h3>

                  {/* Page Navigation for cropped PDF */}
                  {croppedPdfData && croppedPdfData.numPages > 1 && (
                    <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-md p-1 shadow-sm">
                      <button
                        className="p-2 rounded text-xs text-center flex flex-col items-center"
                        onClick={() => setCurrentCroppedPage(prev => Math.max(1, prev - 1))}
                        disabled={currentCroppedPage <= 1}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </button>
                      <div className="text-sm text-blue-800">
                        Page <span className="font-medium text-blue-800">{currentCroppedPage}</span> of <span className="font-medium text-blue-800">{croppedPdfData.numPages || 0}</span>
                      </div>
                      <button
                        className="p-2 rounded text-xs text-center flex flex-col items-center"
                        onClick={() => setCurrentCroppedPage(prev => Math.min(croppedPdfData.numPages || 1, prev + 1))}
                        disabled={!croppedPdfData.numPages || currentCroppedPage >= croppedPdfData.numPages}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* PDF Viewer for cropped PDF */}
                <div className="relative border-gray-200 flex justify-center items-center overflow-hidden p-4 min-h-[500px]">
                  {croppedPdfData ? (
                    <>
                      <ClientPDFViewer
                        file={croppedPdfData.url}
                        currentPage={currentCroppedPage}
                        scale={scale}
                        onLoadSuccess={(pdf) => {
                          console.log("Cropped PDF loaded successfully", pdf);
                          setCroppedPdfLoaded(true);
                        }}
                        onLoadError={(error) => {
                          console.error("Error loading cropped PDF:", error);
                        }}
                        numPages={croppedPdfData.numPages || 1}
                        viewType="single"
                        onPageLoadSuccess={(page) => {
                          console.log("Cropped PDF page loaded", page);
                        }}
                      />
                      {!croppedPdfLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
                          <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2"></div>
                            <p className="text-blue-500">Loading cropped PDF...</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center">
                      <p>No cropped PDF available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Original Editor UI - Always show this now */
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left sidebar - Page thumbnails */}
            <div className="w-full lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-24">
                <div className="p-4 border-b border-gray-200 bg-blue-50">
                  <h3 className="font-medium text-gray-800">Pages</h3>
                </div>

                <div className="max-h-[500px] overflow-y-auto p-4 bg-gray-50">
                  {pdfFile && (
                    <ClientPDFViewer
                      file={pdfFile.url}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onPageLoadSuccess={onPageLoadSuccess}
                      currentPage={currentPage}
                      numPages={numPages}
                      scale={scale}
                      viewType="thumbnails"
                      selectedPages={selectedPages}
                      togglePageSelection={togglePageSelection}
                    />
                  )}
                </div>

                {/* Left Sidebar Ad */}
                <div className="p-4 border-t border-gray-200">
                  <AdSpace type="box" className="rounded overflow-hidden" />
                </div>
              </div>
            </div>

            {/* Main content - PDF viewer and crop area */}
            <div className="flex-1">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="border-b border-gray-200 bg-gray-50 p-3">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className={`px-3 py-1.5 rounded text-xs text-center flex flex-col items-center transition-colors ${isCropping
                          ? selectionLocked
                            ? 'bg-yellow-500 text-white' // Orange when selection is locked
                            : 'bg-red-500 text-white'    // Red when in cropping mode without selection
                          : 'bg-blue-600 text-white'     // Blue when not cropping
                          }`}
                        onClick={isCropping ? (selectionLocked ? adjustCrop : cancelCrop) : toggleCropping}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 13.4V3.6c0-.89.11-1.6 1-1.6h6c.89 0 1 .71 1 1.6v9.8c0 .89-.11 1.6-1 1.6H7c-.89 0-1-.71-1-1.6z" />
                          <path d="M3 7h3" />
                          <path d="M14 7h3" />
                          <path d="M14 16v-4" />
                          <path d="M14 3v4" />
                        </svg>
                        {isCropping
                          ? (selectionLocked ? 'Adjust Crop' : 'Cancel Crop')
                          : 'Crop'
                        }
                      </button>
                    </div>

                    <div className="flex items-center space-x-1 bg-white border border-gray-300 rounded-md p-1 shadow-sm">
                      <button
                        className="p-1.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
                        onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                      <span className="text-sm font-medium px-2 text-blue-800">{Math.round(scale * 100)}%</span>
                      <button
                        className="p-1.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
                        onClick={() => setScale(prev => Math.min(2.0, prev + 0.1))}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Page Navigation */}
                <div className="border-b border-gray-200 p-3 flex justify-between items-center">
                  <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-md p-1 shadow-sm">
                    <button
                      className="p-2 rounded text-xs text-center flex flex-col items-center"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage <= 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                    </button>
                    <div className="text-sm text-blue-800">
                      Page <span className="font-medium text-blue-800">{currentPage}</span> of <span className="font-medium text-blue-800">{numPages || 0}</span>
                    </div>
                    <button
                      className="p-2 rounded text-xs text-center flex flex-col items-center"
                      onClick={() => setCurrentPage(prev => Math.min(numPages || 1, prev + 1))}
                      disabled={!numPages || currentPage >= numPages}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* PDF Viewer */}
                <div
                  ref={canvasRef}
                  className={`relative border-gray-200 flex justify-center items-center overflow-hidden`}
                  style={{
                    cursor: 'default',
                    backgroundColor: 'transparent',
                    position: 'relative',
                    width: '100%',
                    height: '100%'
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* PDF Viewer */}
                  {!isProcessing && (
                    <div className="relative w-full h-full flex justify-center items-center">
                      {pdfFile && (
                        <ClientPDFViewer
                          file={pdfFile.url}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onPageLoadSuccess={onPageLoadSuccess}
                          currentPage={currentPage}
                          numPages={numPages}
                          scale={scale}
                        />
                      )}
                    </div>
                  )}

                  {/* Crop Selection Overlay - with dimmed background and clear selection */}
                  {isCropping && cropDimensions && (
                    <>
                      {/* Top overlay - above selection */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: 0,
                          top: 0,
                          width: '100%',
                          height: cropDimensions.y,
                          backgroundColor: 'rgba(0, 0, 0, 0.15)'
                        }}
                      />

                      {/* Left overlay - left of selection */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: 0,
                          top: cropDimensions.y,
                          width: cropDimensions.x,
                          height: cropDimensions.height,
                          backgroundColor: 'rgba(0, 0, 0, 0.15)'
                        }}
                      />

                      {/* Right overlay - right of selection */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: cropDimensions.x + cropDimensions.width,
                          top: cropDimensions.y,
                          width: `calc(100% - ${cropDimensions.x + cropDimensions.width}px)`,
                          height: cropDimensions.height,
                          backgroundColor: 'rgba(0, 0, 0, 0.15)'
                        }}
                      />

                      {/* Bottom overlay - below selection */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: 0,
                          top: cropDimensions.y + cropDimensions.height,
                          width: '100%',
                          height: `calc(100% - ${cropDimensions.y + cropDimensions.height}px)`,
                          backgroundColor: 'rgba(0, 0, 0, 0.15)'
                        }}
                      />

                      {/* Selection border - with no background */}
                      <div
                        className="absolute border-2 border-blue-500 pointer-events-none"
                        style={{
                          left: `${cropDimensions.x}px`,
                          top: `${cropDimensions.y}px`,
                          width: `${cropDimensions.width}px`,
                          height: `${cropDimensions.height}px`,
                          backgroundColor: 'transparent',
                          cursor: selectionLocked ? 'move' : 'default',
                          pointerEvents: selectionLocked ? 'auto' : 'none' // Enable pointer events when locked
                        }}
                      >
                        {/* Dimension display */}
                        <div className="absolute top-0 left-0 transform -translate-y-full bg-blue-600 text-white px-2 py-1 text-xs rounded">
                          {Math.round(pixelsToPoints(cropDimensions?.width || 0, scale))} × {Math.round(pixelsToPoints(cropDimensions?.height || 0, scale))} pt
                        </div>

                        {/* Draggable area inside selection - only when selection is locked */}
                        {selectionLocked && (
                          <div
                            className="absolute inset-0 cursor-move"
                            style={{ pointerEvents: 'auto' }}
                          />
                        )}

                        {/* Resize handles - shown only when selection is locked */}
                        {selectionLocked && (
                          <>
                            {/* Corner handles */}
                            <div className="absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" style={{ top: 0, left: 0 }} />
                            <div className="absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-full transform translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" style={{ top: 0, right: 0 }} />
                            <div className="absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-full transform -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" style={{ bottom: 0, left: 0 }} />
                            <div className="absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-full transform translate-x-1/2 translate-y-1/2 cursor-nwse-resize" style={{ bottom: 0, right: 0 }} />

                            {/* Edge handles */}
                            <div className="absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-ns-resize" style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)' }} />
                            <div className="absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-ew-resize" style={{ top: '50%', right: 0, transform: 'translate(50%, -50%)' }} />
                            <div className="absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-ns-resize" style={{ bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' }} />
                            <div className="absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-ew-resize" style={{ top: '50%', left: 0, transform: 'translate(-50%, -50%)' }} />
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-full lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-24">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-800">Tools</h3>
                </div>

                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <h4 className="text-sm text-gray-600">Edit PDF</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {isCropping && selectionLocked && cropDimensions && (
                        <div className="p-3 bg-blue-50 rounded border border-blue-200">
                          <h4 className="text-sm font-medium text-blue-700 mb-2">Crop Settings</h4>
                          <div className="mb-3 text-sm text-gray-700">
                            <div className="flex justify-between mb-1">
                              <span>Width:</span>
                              <span className="font-medium">{Math.round(pixelsToPoints(cropDimensions.width, scale))} pt</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Height:</span>
                              <span className="font-medium">{Math.round(pixelsToPoints(cropDimensions.height, scale))} pt</span>
                            </div>
                          </div>

                          {numPages > 1 && (
                            <div className="mb-3">
                              <label className="flex items-center text-sm text-gray-700">
                                <input
                                  className="mr-2 h-4 w-4 text-blue-600"
                                  type="checkbox"
                                  checked={cropAllPages}
                                  onChange={(e) => setCropAllPages(e.target.checked)}
                                />
                                <span>Apply to all pages</span>
                              </label>
                              <p className="text-xs text-gray-500 mt-1">
                                {cropAllPages
                                  ? "The same crop will be applied to all pages."
                                  : "Only the current page will be cropped."}
                              </p>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            <button
                              className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                              onClick={applyCrop}
                            >
                              Apply Crop
                            </button>
                            <button
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
                              onClick={() => {
                                setSelectionLocked(false);
                                setCropDimensions(null);
                              }}
                            >
                              Reset Selection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-blue-800">File Information</h4>
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
                      {/* File Name */}
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-md mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">File Name</div>
                          <div
                            className="font-medium text-gray-800 truncate max-w-[180px]"
                            title={pdfFile?.name || 'document.pdf'}
                            style={{
                              fontSize: pdfFile?.name && pdfFile.name.length > 25
                                ? (pdfFile.name.length > 40 ? '0.7rem' : '0.75rem')
                                : '0.875rem'
                            }}
                          >
                            {pdfFile?.name || 'document.pdf'}
                          </div>
                        </div>
                      </div>

                      {/* File Size */}
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-md mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="4 14 10 14 10 20"></polyline>
                            <polyline points="20 10 14 10 14 4"></polyline>
                            <line x1="14" y1="10" x2="21" y2="3"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">File Size</div>
                          <div className="text-sm text-gray-800">
                            {pdfFile?.size ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
                          </div>
                        </div>
                      </div>

                      {/* Page Count */}
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-md mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            <path d="M9 12h6"></path>
                            <path d="M9 16h6"></path>
                            <path d="M9 8h6"></path>
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Pages</div>
                          <div className="text-sm text-gray-800">
                            {numPages ? `${numPages} ${numPages === 1 ? 'page' : 'pages'}` : 'Loading...'}
                          </div>
                        </div>
                      </div>

                      {/* Paper Size */}
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-md mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="3" y1="15" x2="21" y2="15"></line>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                            <line x1="15" y1="3" x2="15" y2="21"></line>
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Paper Size</div>
                          <div className="text-sm text-gray-800">
                            {paperFormat}
                          </div>
                        </div>
                      </div>

                      {/* Current Status */}
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-md mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Status</div>
                          <div className="text-sm text-gray-800">
                            {isProcessing ? 'Processing...' : cropApplied ? 'Cropped' : 'Ready to edit'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Sidebar Ad */}
                <div className="p-4 border-t border-gray-200">
                  <AdSpace type="sidebar" className="rounded overflow-hidden" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Ad Banner */}
      <div className="container mx-auto px-4 py-4">
        <AdSpace type="large" className="rounded-lg overflow-hidden shadow-sm" />
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-lg font-medium">Processing PDF...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
