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
  signedUrl?: string;
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="rounded-lg border bg-card text-card-foreground shadow-sm"
                >
                  <div className="relative aspect-square">
                    {image.signedUrl ? (
                      <img
                        src={image.signedUrl}
                        alt={image.fileName}
                        className="object-cover w-full h-full rounded-t-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/300?text=Error+Loading+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-t-lg">
                        <span className="text-gray-400">No preview available</span>
                      </div>
                    )}
                    <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-sm ${
                      image.status === 'processed' ? 'bg-green-100 text-green-800' :
                      image.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      image.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {image.status.charAt(0).toUpperCase() + image.status.slice(1)}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium truncate" title={image.fileName}>{image.fileName}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(image.uploadTimestamp).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(image.size / 1024).toFixed(2)} KB
                    </p>
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