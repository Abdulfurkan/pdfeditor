'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import GoogleDrivePicker with no SSR
const GoogleDrivePicker = dynamic(
  () => import('./GoogleDrivePicker'),
  { ssr: false }
);

export default function CloudStorageModal({ isOpen, onClose, service, onFileSelected }) {
  const modalRef = useRef(null);
  
  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Close on escape key
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="relative">
        {service === 'Google Drive' && (
          <GoogleDrivePicker onFileSelected={onFileSelected} onClose={onClose} />
        )}
        {service === 'Dropbox' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Dropbox Integration</h2>
            <p>Dropbox integration coming soon.</p>
            <button 
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
              Close
            </button>
          </div>
        )}
        {service === 'OneDrive' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">OneDrive Integration</h2>
            <p>OneDrive integration coming soon.</p>
            <button 
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
              Close
            </button>
          </div>
        )}
        {service === 'iCloud' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">iCloud Integration</h2>
            <p>iCloud integration coming soon.</p>
            <button 
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
