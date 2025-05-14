import React, { useRef, useState, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ImagesService } from '@/sdk'; // Assuming SDK index exports services
import { ImageMetadata } from '@/sdk'; // Assuming SDK index exports models
import { ApiError } from '@/sdk'; // Assuming SDK index exports ApiError
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

const UploadPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'success' | 'error' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<ImageMetadata | null>(null);
  
  // For visual preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setUploadStatus(null);
      setStatusMessage('');
      setUploadedImage(null);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setUploadStatus(null);
      setStatusMessage('');
      setUploadedImage(null);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Update the file input for consistency
      if (fileInputRef.current) {
        // Note: Can't directly set files property as it's read-only
        // This is just for visual consistency
        // The actual file comes from the drop event
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatusMessage('Please select a file first.');
      setUploadStatus('error');
      return;
    }

    setIsLoading(true);
    setUploadStatus(null);
    setStatusMessage('');
    setUploadedImage(null);

    try {
      const response = await ImagesService.postApiImagesUpload({ file: selectedFile });
      setUploadedImage(response);
      setUploadStatus('success');
      setStatusMessage(`Successfully uploaded ${response.fileName}!`);
      
      // Reset file input and preview
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      
    } catch (error) {
      setUploadStatus('error');
      if (error instanceof ApiError) {
        setStatusMessage(`Upload failed: ${error.body?.message || error.message}`);
      } else if (error instanceof Error) {
        setStatusMessage(`Upload failed: ${error.message}`);
      } else {
        setStatusMessage('An unknown error occurred during upload.');
      }
      console.error('Upload error:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="px-6 py-8 md:px-8">
      <div className="flex items-center mb-6">
        <div className="mr-4 p-2 rounded-full bg-indigo-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
            <path d="M16 5h6v6" />
            <path d="M8 12 19 1" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Upload Images</h1>
      </div>
      
      <Card className="bg-white shadow-md border-indigo-100 overflow-hidden transition-all hover:shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100 pb-6">
          <h2 className="text-xl font-semibold text-indigo-700 flex items-center gap-2">
            <span>Upload New Image</span>
            {isLoading && (
              <div className="inline-block animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
            )}
          </h2>
          <p className="text-slate-500 text-sm">Select an image file (JPEG, PNG, or GIF) to upload</p>
        </CardHeader>
        
        <CardContent className="p-6">
          <div
            className={`
              w-full rounded-xl border-2 border-dashed p-6 mb-6 transition-colors ease-in-out duration-200
              ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}
              ${previewUrl ? 'bg-indigo-50/50 border-indigo-200' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col md:flex-row gap-6">
              {/* Preview area */}
              <div className="w-full md:w-1/3 flex-shrink-0">
                <div className="h-48 flex items-center justify-center rounded-lg overflow-hidden bg-slate-100">
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-h-full max-w-full object-contain rounded transition-all duration-300 ease-in-out" 
                    />
                  ) : (
                    <div className="text-center p-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="block text-slate-400 mt-2">Image preview</span>
                      <span className="block text-slate-400 text-sm">Drag & drop or select a file</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Upload controls */}
              <div className="w-full md:w-2/3 flex flex-col space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    accept="image/png, image/jpeg, image/gif"
                    className="flex-1 border-slate-300 focus:border-indigo-300 cursor-pointer"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Selected file: {selectedFile ? selectedFile.name : 'None'}
                  </p>
                </div>
                
                <Button 
                  onClick={handleUpload} 
                  disabled={!selectedFile || isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-2 justify-center"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
                        <path d="M16 5h6v6"></path>
                        <path d="M8 12 19 1"></path>
                      </svg>
                      <span>Upload Image</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Status messages */}
          {uploadStatus === 'success' && uploadedImage && (
            <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 animate-fadeIn">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <AlertTitle className="font-semibold">Success!</AlertTitle>
              </div>
              <AlertDescription className="mt-2 pl-6">
                {statusMessage}
              </AlertDescription>
            </Alert>
          )}
          {uploadStatus === 'error' && (
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 animate-fadeIn">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <AlertTitle className="font-semibold">Error</AlertTitle>
              </div>
              <AlertDescription className="mt-2 pl-6">
                {statusMessage}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        <CardFooter className="bg-slate-50 border-t border-slate-100 text-xs text-slate-500 px-6 py-3 flex justify-between items-center">
          <div>Supported formats: JPEG, PNG, GIF • Max size: 10MB</div>
          <div className="text-xs text-indigo-600">View gallery to see all uploads</div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UploadPage; 