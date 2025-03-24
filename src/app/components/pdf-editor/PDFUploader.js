'use client';

import { useState, useRef, useEffect } from 'react';
import CloudStorageModal from '../cloud-storage/CloudStorageModal';

export default function PDFUploader({ onFileSelected, pageType = 'crop' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      if (files[0].type === 'application/pdf') {
        processFile(files[0]);
      } else {
        setError('Please upload a PDF file.');
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      if (files[0].type === 'application/pdf') {
        processFile(files[0]);
      } else {
        setError('Please upload a PDF file.');
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  const processFile = (file) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Direct URL creation - simplest approach
      const fileUrl = URL.createObjectURL(file);
      
      // Pass the file to the parent component with minimal processing
      onFileSelected({ 
        file: file,
        url: fileUrl,
        name: file.name,
        size: file.size
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error processing PDF:', error);
      setError('There was an error processing your PDF. Please try another file.');
      setIsLoading(false);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCloudServiceClick = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleCloudFileSelected = (fileData) => {
    onFileSelected(fileData);
    setIsModalOpen(false);
    setSelectedService(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">
          {pageType === 'crop' ? 'Crop PDF' : 'Remove PDF Pages'}
        </h2>
        <p className="text-gray-600">
          {pageType === 'crop' 
            ? 'Upload your PDF to crop pages or remove unwanted margins.'
            : 'Upload your PDF to select and remove specific pages from your document.'}
        </p>
      </div>
      
      {/* Ad space - Top */}
      <div className="w-full h-[90px] bg-gray-200 mb-6 flex items-center justify-center text-gray-500 border">
        Ad Space (728x90)
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Processing your PDF...</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-lg mb-2 text-gray-700">Drag &amp; drop your PDF file here</p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            
            {/* Upload buttons section with dropdown */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <label className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded cursor-pointer transition-colors">
                Upload Files
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded flex items-center gap-2 transition-colors border border-gray-300"
                >
                  <svg className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Select Cloud
                  <svg className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <div className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 border-b border-gray-200">
                        Cloud Storage Options
                      </div>
                      <button
                        onClick={() => handleCloudServiceClick('Google Drive')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        role="menuitem"
                      >
                        <svg className="mr-3 h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 14L4 6H20L12 14Z" />
                          <path d="M4 16L8 10L12 14L8 18L4 16Z" />
                          <path d="M20 16L16 10L12 14L16 18L20 16Z" />
                        </svg>
                        Google Drive
                      </button>
                      <button
                        onClick={() => handleCloudServiceClick('Dropbox')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        role="menuitem"
                      >
                        <svg className="mr-3 h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L6 6L12 10L6 14L12 18L18 14L12 10L18 6L12 2Z" />
                          <path d="M12 10L6 14L12 18L18 14L12 10Z" />
                        </svg>
                        Dropbox
                      </button>
                      <button
                        onClick={() => handleCloudServiceClick('OneDrive')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        role="menuitem"
                      >
                        <svg className="mr-3 h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 6L4 10L10 14L4 18L10 22L16 18L10 14L16 10L10 6Z" />
                          <path d="M16 10L10 14L16 18L22 14L16 10Z" />
                        </svg>
                        OneDrive
                      </button>
                      <button
                        onClick={() => handleCloudServiceClick('iCloud')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        role="menuitem"
                      >
                        <svg className="mr-3 h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 16.5A4.5 4.5 0 0110.5 12a4.5 4.5 0 014.5 4.5 4.5 4.5 0 01-4.5 4.5A4.5 4.5 0 016 16.5zM12 3a9 9 0 019 9 9 9 0 01-9 9 9 9 0 01-9-9 9 9 0 019-9z" />
                        </svg>
                        iCloud
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Ad space - Bottom */}
      <div className="w-full h-[250px] bg-gray-200 mt-8 flex items-center justify-center text-gray-500 border">
        Ad Space (728x250)
      </div>

      {/* Cloud Storage Modal */}
      <CloudStorageModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        service={selectedService}
        onFileSelected={handleCloudFileSelected}
      />
    </div>
  );
}
