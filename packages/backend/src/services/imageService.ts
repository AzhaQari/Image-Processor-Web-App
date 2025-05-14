import { randomUUID } from 'crypto';
import { generateSignedUrl, fileExists, getStorage } from './gcsService';
import { getConfig } from '../config/secrets';

// Constant for thumbnail prefix (matching the Cloud Function)
const THUMBNAIL_PREFIX = 'thumbnails/';

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
    
    // First, get all the original files for this user to know which images they own
    const [userOriginalFiles] = await bucket.getFiles({
      prefix: `${userId}/`, // Get all files in the user's directory
      delimiter: '/' // We only want files directly under userId/, not in subdirectories like thumbnails/
    });
    
    // Filter out any "directory" results if delimiter is used and GCS returns them
    const actualUserOriginalFiles = userOriginalFiles.filter(file => !file.name.endsWith('/'));

    console.log(`Found ${actualUserOriginalFiles.length} actual original files for user ${userId}`);
    
    // Get the thumbnail files specifically from the user's thumbnail directory
    const userThumbnailPrefix = `${userId}/${THUMBNAIL_PREFIX}`;
    const [userThumbnails] = await bucket.getFiles({
      prefix: userThumbnailPrefix
    });
    
    console.log(`Found ${userThumbnails.length} thumbnails for user ${userId} using prefix ${userThumbnailPrefix}`);
    
    // Map thumbnail files to ImageMetadata objects
    const imagePromises = userThumbnails.map(async (thumbnailFile) => {
      // Ensure we don't process placeholder "directory" objects if GCS lists them
      if (thumbnailFile.name === userThumbnailPrefix && thumbnailFile.name.endsWith('/')) {
        return null; // Skip this entry
      }

      const [metadata] = await thumbnailFile.getMetadata();
      
      // Extract the original filename by stripping the user-specific thumbnail prefix
      const originalFileName = thumbnailFile.name.replace(userThumbnailPrefix, '');
      
      // Find the corresponding original file
      const originalFile = actualUserOriginalFiles.find(file => {
        // Original files are like "userId/uuid_fileName". We need the base name.
        const parts = file.name.split('/');
        const baseFileNameWithUuid = parts.length > 1 ? parts[parts.length - 1] : file.name;
        // The originalFileName from thumbnail does not have the UUID prefix.
        // We assume the thumbnail filename directly matches the part after UUID of original.
        // Example: original "userId/uuid_cat.jpg", thumbnail "userId/thumbnails/cat.jpg" -> originalFileName "cat.jpg"
        // This matching logic might need review based on actual naming conventions.
        // For now, let's assume thumbnail `originalFileName` is the clean name.
        // The Cloud Function for thumbnails should ensure it saves thumbnails with a name
        // that can be related back to the original. If originals are `uuid_name.jpg`
        // and thumbnails are `name.jpg` (in their folder), this logic is tricky.

        // Let's re-evaluate based on the original code's intention:
        // The previous code did: `userOriginalBaseNames.add(file.name.split('/').pop())`
        // And then `thumbnailFile.name.replace(THUMBNAIL_PREFIX, '')`
        // This implies original base names were like `uuid_cat.jpg` and thumbnail names (after stripping global prefix) were `uuid_cat.jpg`.
        // So, if `thumbnailFile.name` is `userId/thumbnails/uuid_cat.jpg`, then `originalFileName` (after stripping userThumbnailPrefix) is `uuid_cat.jpg`.
        // This `originalFileName` should match `file.name.split('/').pop()`.

        const originalFileBaseName = file.name.split('/').pop();
        return originalFileBaseName === originalFileName;
      });
      
      // Generate a signed URL for the thumbnail
      const signedUrl = await generateSignedUrl(`gs://${bucketName}/${thumbnailFile.name}`);
      
      // Parse size from metadata, defaulting to 0 if undefined or if parsing fails
      const sizeStr = metadata.size as string | undefined;
      const size = sizeStr ? parseInt(sizeStr, 10) || 0 : 0;
      
      // Get the timestamp from original file if possible, otherwise use thumbnail timestamp
      let uploadTimestamp: Date;
      if (originalFile) {
        const [originalMetadata] = await originalFile.getMetadata();
        const timestampStr = originalMetadata.updated || originalMetadata.timeCreated;
        uploadTimestamp = timestampStr ? new Date(timestampStr) : new Date();
      } else {
        console.warn(`No original file found for thumbnail: ${thumbnailFile.name}. Using thumbnail's timestamp.`);
        const timestampStr = metadata.updated || metadata.timeCreated;
        uploadTimestamp = timestampStr ? new Date(timestampStr) : new Date();
      }
      
      // Create an ImageMetadata object
      const imageMetadata: ImageMetadata = {
        id: thumbnailFile.name, // Use the thumbnail path as the ID
        userId,
        fileName: originalFileName, // This should be the "clean" or original filename
        gcsPath: `gs://${bucketName}/${thumbnailFile.name}`,
        contentType: metadata.contentType || 'application/octet-stream',
        size,
        uploadTimestamp,
        status: 'processed', // All thumbnails are processed
        signedUrl
      };
      
      return imageMetadata;
    });
    
    // Wait for all promises to resolve and filter out any nulls (from directory placeholders)
    const resolvedImages = await Promise.all(imagePromises);
    const thumbnailImages = resolvedImages.filter(img => img !== null) as ImageMetadata[];
    
    // Sort by uploadTimestamp, newest first
    return thumbnailImages.sort((a, b) => b.uploadTimestamp.getTime() - a.uploadTimestamp.getTime());
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