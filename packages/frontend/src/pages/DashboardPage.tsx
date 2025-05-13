import React, { useState, ChangeEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ImagesService } from '@/sdk'; // Assuming SDK index exports services
import { ImageMetadata } from '@/sdk'; // Assuming SDK index exports models
import { ApiError } from '@/sdk'; // Assuming SDK index exports ApiError

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'success' | 'error' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<ImageMetadata | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadStatus(null); // Reset status on new file selection
      setStatusMessage('');
      setUploadedImage(null);
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
      setSelectedFile(null); // Clear file input after successful upload
      // TODO: Refresh image list or add to local list
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
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Dashboard</h1>
        <Button onClick={logout} variant="destructive">Logout</Button>
      </div>
      {user && <p style={{ marginBottom: '20px' }}>Welcome, {user.name || user.email}!</p>}
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Upload New Image</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Input type="file" onChange={handleFileChange} disabled={isLoading} accept="image/png, image/jpeg, image/gif" />
          <Button onClick={handleUpload} disabled={!selectedFile || isLoading}>
            {isLoading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>

      {uploadStatus === 'success' && uploadedImage && (
        <Alert variant="default" className="mt-4 bg-green-100 border-green-400 text-green-700">
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>
            {statusMessage} (ID: {uploadedImage.id}, Path: {uploadedImage.gcsPath})
          </AlertDescription>
        </Alert>
      )}
      {uploadStatus === 'error' && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      )}

      <p style={{ marginTop: '40px' }}>This is your dashboard. Image upload and gallery will be here.</p>
      {/* Image gallery will go here later */}
    </div>
  );
};

export default DashboardPage; 