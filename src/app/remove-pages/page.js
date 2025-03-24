'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { PDFDocument } from 'pdf-lib';
import AdSpace from '../components/ads/AdSpace';
import Footer from '../components/common/Footer';
import PDFUploader from '../components/pdf-editor/PDFUploader';
import Link from 'next/link';

// Dynamically import PDFRemover to avoid SSR issues
const PDFRemover = dynamic(
  () => import('../components/pdf-editor/PDFRemover'),
  { ssr: false }
);

export default function RemovePages() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleFileSelected = (file) => {
    // If there's an existing file, revoke its URL to prevent memory leaks
    if (pdfFile && pdfFile.url) {
      URL.revokeObjectURL(pdfFile.url);
    }
    
    // Create a new blob URL to ensure it's always fresh
    const pdfBlob = new Blob([file.file], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Add a unique timestamp to force reload
    const uniqueUrl = `${pdfUrl}#t=${Date.now()}`;
    
    // Create a modified file object with the unique URL
    const fileWithUniqueUrl = {
      ...file,
      url: uniqueUrl,
      forceReload: true // Add a flag to indicate this file should force reload
    };
    
    setPdfFile(fileWithUniqueUrl);
  };

  const handleReset = () => {
    // Revoke the URL to prevent memory leaks
    if (pdfFile && pdfFile.url) {
      URL.revokeObjectURL(pdfFile.url);
    }
    setPdfFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white backdrop-filter backdrop-blur-lg bg-opacity-70 border-b border-gray-100 sticky top-0 z-50 py-4">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center group">
            <div className="relative overflow-hidden rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 p-2 mr-4 shadow-md transform transition duration-300 group-hover:shadow-lg group-hover:scale-105">
              <Image 
                src="/pdflogo.png" 
                alt="PDF Editor Logo" 
                width={40} 
                height={40} 
                className="relative z-10"
              />
              <div className="absolute inset-0 bg-white opacity-20 rounded-full"></div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent tracking-tight">PDF Crop Tool</h1>
          </div>
          <nav className="hidden md:flex items-center">
            <div className="relative mx-2">
              <Link href="/" className="px-4 py-2 font-medium text-gray-700 hover:text-blue-600 transition-colors relative group">
                Crop PDF
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
            </div>
            <div className="relative mx-2">
              <Link href="/remove-pages" className="px-4 py-2 font-medium text-blue-600 relative group">
                Remove Pages
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transition-all duration-300"></span>
              </Link>
            </div>
          </nav>
          {pdfFile && (
            <button
              onClick={handleReset}
              className="px-5 py-2 rounded-md bg-gradient-to-r from-blue-600 to-indigo-700 text-white transition-all duration-300 shadow hover:shadow-lg hover:translate-y-[-2px] flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload New PDF
            </button>
          )}
          <button 
            className="md:hidden focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white shadow-lg rounded-b-lg mt-1 mx-4 overflow-hidden transition-all duration-300 ease-in-out">
            <div className="flex flex-col py-2">
              <Link 
                href="/" 
                className="px-6 py-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-600 transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Crop PDF
              </Link>
              <Link 
                href="/remove-pages" 
                className="px-6 py-3 text-blue-600 font-medium border-l-4 border-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Remove Pages
              </Link>
              {pdfFile && (
                <button
                  onClick={() => {
                    handleReset();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center px-6 py-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-600 transition-all duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Upload New PDF
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Top Ad Space */}
        <AdSpace type="banner" className="mb-8" />
        
        {!pdfFile ? (
          <PDFUploader onFileSelected={handleFileSelected} pageType="remove" />
        ) : (
          <PDFRemover file={pdfFile} onReset={handleReset} />
        )}
      </main>

      <Footer />
    </div>
  );
}
