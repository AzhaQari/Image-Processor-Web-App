import { randomUUID } from 'crypto';
import { generateSignedUrl } from './gcsService';

export interface ImageMetadata {
  id: string;
  userId: string;
  fileName: string; // Original filename from user
  gcsPath: string;  // Path in GCS, e.g., bucketName/userId/uuid_fileName
  contentType: string;
  size: number; // in bytes
  uploadTimestamp: Date;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  signedUrl?: string;
  // Optionally, add processedImageGcsPath, thumbnailUrl, etc.
}

// In-memory store for image metadata
const images: ImageMetadata[] = [];

export const saveImageMetadata = async (metadata: Omit<ImageMetadata, 'id' | 'uploadTimestamp' | 'signedUrl'>): Promise<ImageMetadata> => {
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
  const image = images.find(img => img.id === id && img.userId === userId);
  if (image) {
    try {
      image.signedUrl = await generateSignedUrl(image.gcsPath);
    } catch (error) {
      console.error(`Failed to generate signed URL for image ${id}:`, error);
    }
  }
  return image;
};

export const getImagesByUserId = async (userId: string): Promise<ImageMetadata[]> => {
  const userImages = images
    .filter(img => img.userId === userId)
    .sort((a, b) => b.uploadTimestamp.getTime() - a.uploadTimestamp.getTime());

  // Generate signed URLs for all images
  await Promise.all(
    userImages.map(async (image) => {
      try {
        image.signedUrl = await generateSignedUrl(image.gcsPath);
      } catch (error) {
        console.error(`Failed to generate signed URL for image ${image.id}:`, error);
      }
    })
  );

  return userImages;
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