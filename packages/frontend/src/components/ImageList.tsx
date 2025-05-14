import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';

interface ImageMetadata {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadTimestamp: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  gcsPath: string;
}

export function ImageList() {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // TODO: Replace with SDK call
        const response = await fetch('http://localhost:3000/api/images', {
          credentials: 'include' // Important for sending cookies
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Your Images</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Your Images</h2>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 p-4">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-2xl font-bold">Your Images</h2>
      </CardHeader>
      <CardContent>
        <div className="max-h-[600px] overflow-y-auto">
          {images.length === 0 ? (
            <p className="text-center text-gray-500">No images uploaded yet.</p>
          ) : (
            <div className="space-y-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <h3 className="font-medium">{image.fileName}</h3>
                    <p className="text-sm text-gray-500">
                      Uploaded: {new Date(image.uploadTimestamp).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Size: {(image.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      image.status === 'processed' ? 'bg-green-100 text-green-800' :
                      image.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      image.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {image.status.charAt(0).toUpperCase() + image.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 