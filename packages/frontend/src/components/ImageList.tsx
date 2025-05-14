import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';
import { Badge } from '../components/ui/badge';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { toast } from '@/hooks/use-toast';
import showToast from '@/lib/toastify';

interface ImageMetadata {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadTimestamp: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  gcsPath: string;
  signedUrl?: string;
}

export function ImageList() {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribeToImageStatusUpdates } = useWebSocket();

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // TODO: Replace with SDK call
        const response = await fetch('http://localhost:3000/api/images', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }
        
        const data = await response.json();
        setImages(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load images');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, []);

  useEffect(() => {
    console.log('Setting up image status update subscription in ImageList');
    
    const unsubscribe = subscribeToImageStatusUpdates((statusUpdate) => {
      console.log('📱 Received image status update in ImageList:', statusUpdate);
      console.log(`📊 Status: ${statusUpdate.status}, ID: ${statusUpdate.id}, FileName: ${statusUpdate.fileName}`);
      
      setImages(prevImages => {
        // Check if we already have this image
        const existing = prevImages.find(img => img.id === statusUpdate.id);
        
        if (existing) {
          console.log(`✏️ Updating existing image ${statusUpdate.id} from status ${existing.status} to ${statusUpdate.status}`);
          // Update existing image
          return prevImages.map(img => 
            img.id === statusUpdate.id 
              ? { ...img, status: statusUpdate.status } 
              : img
          );
        } else {
          console.log(`🆕 Image ${statusUpdate.id} not found in current list, may be a new upload`);
          // If this is a new image that's not in our list yet, we might want to refresh the list
          // For simplicity, we'll just return the current list, but you could also fetch the updated list
          return prevImages;
        }
      });
      
      // Show toast notification
      let toastType: 'info' | 'success' | 'warning' | 'error' = 'info';
      let toastTitle = '';
      let toastDescription = '';
      
      switch (statusUpdate.status) {
        case 'processing':
          console.log('🔄 Preparing PROCESSING toast in ImageList');
          toastType = 'info';
          toastTitle = `⏳ Processing ${statusUpdate.fileName}`;
          toastDescription = 'Your image is being processed...';
          break;
        case 'processed':
          console.log('✨ Preparing PROCESSED toast in ImageList');
          toastType = 'success';
          toastTitle = `✅ ${statusUpdate.fileName} Processed!`;
          toastDescription = 'Your image has been successfully processed.';
          break;
        case 'failed':
          console.log('💥 Preparing FAILED toast in ImageList');
          toastType = 'error';
          toastTitle = `❌ ${statusUpdate.fileName} Failed`;
          toastDescription = statusUpdate.errorMessage || 'An error occurred during processing.';
          break;
        default:
          console.log(`⚠️ Unknown status: ${statusUpdate.status}, using default toast type`);
      }
      
      console.log(`🚀 Showing ${toastType.toUpperCase()} toast: ${toastTitle}`);
      
      // Use the new standalone toast implementation
      showToast({
        title: toastTitle,
        toastMsg: toastDescription,
        position: "top-right",
        type: toastType,
        showProgress: true,
        autoCloseTime: toastType === 'error' ? 8000 : 5000,
        pauseOnHover: true,
        pauseOnFocusLoss: true,
        canClose: true,
        theme: "light"
      });
    });
    
    return () => {
      console.log('Cleaning up image status update subscription in ImageList');
      unsubscribe();
    };
  }, [subscribeToImageStatusUpdates]);

  const handleDownload = async (image: ImageMetadata) => {
    if (!image.signedUrl) {
      // Show toast instead of alert
      // Use the new standalone toast implementation
      showToast({
        title: "❌ No Download URL",
        toastMsg: "No download URL available for this image.",
        position: "top-right",
        type: "warning",
        showProgress: true,
        autoCloseTime: 5000,
        pauseOnHover: true,
        pauseOnFocusLoss: true,
        canClose: true,
        theme: "light"
      });
      return;
    }
    try {
      const response = await fetch(image.signedUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', image.fileName || 'download');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      // Show success toast
      // Use the new standalone toast implementation
      showToast({
        title: "✅ Download Successful",
        toastMsg: `${image.fileName} has been downloaded.`,
        position: "top-right",
        type: "success",
        showProgress: true,
        autoCloseTime: 3000,
        pauseOnHover: true,
        pauseOnFocusLoss: true,
        canClose: true,
        theme: "light"
      });
    } catch (err) {
      console.error('Download error:', err);
      // Use the new standalone toast implementation
      showToast({
        title: "❌ Download Failed",
        toastMsg: err instanceof Error ? err.message : 'Could not download image.',
        position: "top-right",
        type: "error",
        showProgress: true,
        autoCloseTime: 8000,
        pauseOnHover: true,
        pauseOnFocusLoss: true,
        canClose: true,
        theme: "light"
      });
    }
  };

  const handleDelete = async (imageId: string, gcsPath: string) => {
    // Show confirmation toast
    if (!window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }
    try {
      // TODO: Replace with actual SDK call to backend
      const response = await fetch(`http://localhost:3000/api/images/${imageId}`, {
        method: 'DELETE',
        credentials: 'include',
        // Potentially send gcsPath in body if needed by backend for GCS deletion
        // headers: { 'Content-Type': 'application/json' },
        // body: JSON.stringify({ gcsPath }) 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete image. Server response not readable.' }));
        throw new Error(errorData.message || `Failed to delete image. Status: ${response.status}`);
      }

      setImages(prevImages => prevImages.filter(img => img.id !== imageId));
      // Show success toast
      // Use the new standalone toast implementation
      showToast({
        title: "✅ Image Deleted",
        toastMsg: "Image deleted successfully.",
        position: "top-right",
        type: "success",
        showProgress: true,
        autoCloseTime: 5000,
        pauseOnHover: true,
        pauseOnFocusLoss: true,
        canClose: true,
        theme: "light"
      });

    } catch (err) {
      console.error('Delete error:', err);
      // Use the new standalone toast implementation
      showToast({
        title: "❌ Delete Failed",
        toastMsg: err instanceof Error ? err.message : 'Could not delete image.',
        position: "top-right",
        type: "error",
        showProgress: true,
        autoCloseTime: 8000,
        pauseOnHover: true,
        pauseOnFocusLoss: true,
        canClose: true,
        theme: "light"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'processed': return 'bg-green-100 text-green-800 border-green-200';
      case 'processing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="px-6 py-8 md:px-8">
        <div className="flex items-center mb-6">
          <div className="mr-4 p-2 rounded-full bg-indigo-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Your Images</h1>
        </div>
        
        <Card className="bg-white shadow-md border-indigo-100 overflow-hidden animate-pulse">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100 flex justify-between items-center">
            <div>
              <div className="h-6 w-48 bg-slate-200 rounded mb-2"></div>
              <div className="h-4 w-32 bg-slate-100 rounded"></div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
              <p className="mt-6 text-indigo-600 font-medium">Loading your images...</p>
              <p className="text-slate-500 mt-2">This may take a moment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-8 md:px-8">
        <div className="flex items-center mb-6">
          <div className="mr-4 p-2 rounded-full bg-red-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Your Images</h1>
        </div>
        
        <Card className="border-red-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-red-50 border-b border-red-100">
            <h2 className="text-xl font-semibold text-red-700">Error Loading Images</h2>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center py-8 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="mt-4 text-center font-medium text-lg">{error}</p>
              <p className="mt-2 text-center text-red-500">Please try again later or contact support if the problem persists.</p>
              <button 
                className="mt-6 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 md:px-8">
      <div className="flex items-center mb-6">
        <div className="mr-4 p-2 rounded-full bg-indigo-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Your Images</h1>
      </div>
      
      <Card className="bg-white shadow-md border-indigo-100 overflow-hidden transition-all hover:shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100">
          <div>
            <h2 className="text-xl font-semibold text-indigo-700">Image Management</h2>
            <p className="text-slate-500 text-sm">{images.length} images found in your collection</p>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {images.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-6 text-slate-600 text-lg font-medium">No images uploaded yet</p>
              <p className="text-sm text-slate-500 mt-2">Your uploaded images will appear here</p>
              <button 
                className="mt-6 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors flex items-center gap-2 mx-auto"
                onClick={() => window.location.href = '/dashboard/upload'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                  <path d="M16 5h6v6" />
                  <path d="M8 12 19 1" />
                </svg>
                <span>Upload Your First Image</span>
              </button>
            </div>
          ) : (
            <div className="overflow-hidden border border-slate-200 rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-indigo-50">
                  <tr>
                    <th scope="col" className="px-8 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider border-b border-indigo-200">Preview</th>
                    <th scope="col" className="px-8 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider border-b border-indigo-200 border-l border-indigo-200">File Information</th>
                    <th scope="col" className="px-8 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider border-b border-indigo-200 border-l border-indigo-200">Status</th>
                    <th scope="col" className="px-8 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider border-b border-indigo-200 border-l border-indigo-200">Details</th>
                    <th scope="col" className="px-8 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider border-b border-indigo-200 border-l border-indigo-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {images.map((image, index) => (
                    <tr key={image.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50/40 transition-colors`}>
                      <td className="px-8 py-4 border-b border-slate-200 border-l border-slate-200 align-top">
                        <div className="h-[100px] w-[100px] rounded-md bg-slate-100 overflow-hidden flex items-center justify-center shadow-sm border border-slate-200">
                          {image.signedUrl ? (
                            <img
                              src={image.signedUrl}
                              alt={image.fileName}
                              className="w-[100px] h-[100px] object-contain"
                              style={{ 
                                maxWidth: '1000px', 
                                maxHeight: '100px', 
                                width: '100px',
                                height: '100px',
                                objectFit: 'contain',
                                display: 'block' 
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://via.placeholder.com/100?text=Error';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-slate-400 text-xs">No preview</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-4 border-b border-slate-200 border-l border-slate-200 align-top">
                        <div className="text-sm font-medium text-slate-800 truncate max-w-[200px]" title={image.fileName}>
                          {image.fileName}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{image.contentType}</div>
                      </td>
                      <td className="px-8 py-4 border-b border-slate-200 border-l border-slate-200 align-top">
                        <Badge className={`px-3 py-1 ${getStatusColor(image.status)}`}>
                          {image.status.charAt(0).toUpperCase() + image.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-8 py-4 border-b border-slate-200 border-l border-slate-200 align-top">
                        <div className="flex flex-col space-y-1">
                          <div className="text-xs flex items-center gap-1 text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>Uploaded: {formatDate(image.uploadTimestamp)}</span>
                          </div>
                          <div className="text-xs flex items-center gap-1 text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <span>Size: {formatFileSize(image.size)}</span>
                          </div>
                          <div className="text-xs flex items-center gap-1 text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span>ID: {image.id.slice(0, 12)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 border-b border-slate-200 border-l border-slate-200 align-top">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDownload(image)}
                            title="Download image"
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(image.id, image.gcsPath)}
                            title="Delete image"
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        
        {images.length > 0 && (
          <CardFooter className="bg-slate-50 border-t border-slate-100 text-xs text-slate-500 px-6 py-6 mt-8 flex justify-between items-center">
            <div>Showing all {images.length} images • Sorted by newest first</div>
            {/* <div className="text-indigo-600 font-medium">
              Chart View
            </div> */}
          </CardFooter>
        )}
      </Card>
      
      {/* <footer className="mt-120 text-center text-slate-500 text-sm">
        <div className="font-semibold mb-1">Image Processor</div>
        <div className="mb-1">Image Processor Web App © 2025</div>
        <div className="text-xs">Secure cloud-based image processing</div>
      </footer> */}
    </div>
  );
} 