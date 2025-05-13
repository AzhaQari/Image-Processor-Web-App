import { randomUUID } from 'crypto';

export interface ImageMetadata {
  id: string;
  userId: string;
  fileName: string; // Original filename from user
  gcsPath: string;  // Path in GCS, e.g., bucketName/userId/uuid_fileName
  contentType: string;
  size: number; // in bytes
  uploadTimestamp: Date;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  // Optionally, add processedImageGcsPath, thumbnailUrl, etc.
}

// In-memory store for image metadata
const images: ImageMetadata[] = [];

export const saveImageMetadata = async (metadata: Omit<ImageMetadata, 'id' | 'uploadTimestamp'>): Promise<ImageMetadata> => {
  const newImage: ImageMetadata = {
    ...metadata,
    id: randomUUID(),
    uploadTimestamp: new Date(),
  };
  images.push(newImage);
  console.log('Image metadata saved:', newImage);
  return newImage;
};

export const getImageMetadataById = async (id: string, userId: string): Promise<ImageMetadata | undefined> => {
  return images.find(img => img.id === id && img.userId === userId);
};

export const getImagesByUserId = async (userId: string): Promise<ImageMetadata[]> => {
  return images.filter(img => img.userId === userId).sort((a, b) => b.uploadTimestamp.getTime() - a.uploadTimestamp.getTime());
};

export const updateImageStatus = async (id: string, userId: string, status: ImageMetadata['status']): Promise<ImageMetadata | undefined> => {
  const imageIndex = images.findIndex(img => img.id === id && img.userId === userId);
  if (imageIndex > -1) {
    images[imageIndex].status = status;
    console.log(`Image ${id} status updated to ${status}`);
    return images[imageIndex];
  }
  return undefined;
}; 