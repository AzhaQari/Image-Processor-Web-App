import { randomUUID } from 'crypto';
import { generateSignedUrl, fileExists, getStorage } from './gcsService';
import { getConfig } from '../config/secrets';

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
  try {
    const config = getConfig();
    const bucketName = config.gcsBucketName;
    
    if (!bucketName) {
      throw new Error('GCS bucket name not configured');
    }
    
    // Get bucket using the imported getStorage function
    const bucket = getStorage().bucket(bucketName);
    
    // List files with the user ID as prefix
    const [files] = await bucket.getFiles({
      prefix: `${userId}/`
    });
    
    console.log(`Found ${files.length} files for user ${userId}`);
    
    // Map GCS files to ImageMetadata objects
    const imagePromises = files.map(async (file) => {
      const [metadata] = await file.getMetadata();
      
      // Extract the original filename from the GCS filename
      // GCS filename format: userId/uniqueId_originalFilename
      const fileNameParts = file.name.split('/');
      const originalFileName = fileNameParts[fileNameParts.length - 1].substring(
        fileNameParts[fileNameParts.length - 1].indexOf('_') + 1
      );
      
      // Generate a signed URL for the file
      const signedUrl = await generateSignedUrl(`gs://${bucketName}/${file.name}`);
      
      // Parse size from metadata, defaulting to 0 if undefined or if parsing fails
      const sizeStr = metadata.size as string | undefined;
      const size = sizeStr ? parseInt(sizeStr, 10) || 0 : 0;
      
      // Get the timestamp, defaulting to current time if both are undefined
      const timestampStr = metadata.updated || metadata.timeCreated;
      const uploadTimestamp = timestampStr ? new Date(timestampStr) : new Date();
      
      // Create an ImageMetadata object
      const imageMetadata: ImageMetadata = {
        id: file.name, // Use the GCS path as the ID since we don't have the original ID
        userId,
        fileName: originalFileName,
        gcsPath: `gs://${bucketName}/${file.name}`,
        contentType: metadata.contentType || 'application/octet-stream',
        size,
        uploadTimestamp,
        status: 'processed', // Assume all files in GCS are processed
        signedUrl
      };
      
      return imageMetadata;
    });
    
    // Wait for all promises to resolve
    const images = await Promise.all(imagePromises);
    
    // Sort by uploadTimestamp, newest first
    return images.sort((a, b) => b.uploadTimestamp.getTime() - a.uploadTimestamp.getTime());
  } catch (error) {
    console.error('Error fetching images from GCS:', error);
    
    // Fallback to in-memory store if GCS fetch fails
    console.log('Falling back to in-memory store');
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
  }
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