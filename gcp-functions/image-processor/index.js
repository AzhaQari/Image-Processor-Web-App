const { Storage } = require('@google-cloud/storage');
const sharp = require('sharp');
const path = require('path');
const axios = require('axios');  // Add axios for HTTP requests

const storage = new Storage();

// Configuration for thumbnails
const THUMBNAIL_MAX_WIDTH = 200;
const THUMBNAIL_MAX_HEIGHT = 200;
const THUMBNAIL_PREFIX = 'thumbnails/';

// Backend API configuration - This should be set via environment variables in production
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';
const CLOUD_FUNCTION_API_KEY = process.env.CLOUD_FUNCTION_API_KEY || 'dev-cloud-function-key';

/**
 * Sends a notification to the backend when image processing is complete
 * 
 * @param {string} userId The user ID who owns the image
 * @param {string} imageId The ID of the processed image
 * @param {string} status The processing status ('processed' or 'failed')
 * @param {string} thumbnailPath Optional path to the thumbnail
 * @param {string} errorMessage Optional error message if status is 'failed'
 * @returns {Promise<void>}
 */
async function notifyBackend(userId, imageId, status, thumbnailPath = null, errorMessage = null) {
  try {
    console.log(`Notifying backend of image processing result. Status: ${status}, imageId: ${imageId}, userId: ${userId}`);
    
    // Construct the notification payload
    const payload = {
      imageId,
      userId,
      status,
      apiKey: CLOUD_FUNCTION_API_KEY
    };
    
    // Add optional fields
    if (thumbnailPath) {
      payload.thumbnailPath = thumbnailPath;
    }
    
    if (errorMessage) {
      payload.errorMessage = errorMessage;
    }
    
    // Send POST request to the backend notification endpoint
    const response = await axios.post(
      `${BACKEND_API_URL}/api/internal/image-processed`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`Backend notification response: ${response.status} ${response.statusText}`);
    console.log(`Response data:`, response.data);
    
    return response.data;
  } catch (error) {
    console.error('Failed to notify backend:', error);
    console.error('Error response:', error.response?.data || 'No response data');
    throw error;
  }
}

/**
 * Triggered by a change to a Cloud Storage bucket.
 *
 * @param {object} event The Cloud Functions event metadata.
 * @param {object} context The Cloud Functions context metadata.
 */
exports.processImageToThumbnail = async (event, context) => {
  const file = event; // In GCS V2 events, the event IS the file object
  const bucketName = file.bucket;
  const filePath = file.name;
  const contentType = file.contentType;

  // Exit if this is triggered by a file already in the thumbnails folder or not an image.
  if (filePath.startsWith(THUMBNAIL_PREFIX) || !contentType.startsWith('image/')) {
    console.log(`Skipping processing for ${filePath} as it's a thumbnail or not an image.`);
    return null;
  }

  console.log(`Processing file: ${filePath} in bucket: ${bucketName}`);
  
  // Extract user ID from the start of the path (assuming format: userId/fileId_filename.ext)
  const pathParts = filePath.split('/');
  const userId = pathParts[0]; // The first directory in the path should be userId
  const fileName = pathParts.length > 1 ? pathParts[pathParts.length - 1] : filePath;
  const imageId = filePath; // Use the full GCS path as the image ID (for simplicity)

  // Update status to 'processing' - similar notification as below, but with 'processing' status
  try {
    await notifyBackend(userId, imageId, 'processing');
  } catch (error) {
    console.error('Failed to notify backend of processing start:', error);
    // Continue even if notification fails
  }

  const bucket = storage.bucket(bucketName);
  const originalFile = bucket.file(filePath);
  
  // Create a name for the thumbnail
  const thumbnailFilePath = `${userId}/${THUMBNAIL_PREFIX}${fileName}`;
  const thumbnailFile = bucket.file(thumbnailFilePath);

  // Create a writable stream for uploading the thumbnail
  const thumbnailUploadStream = thumbnailFile.createWriteStream({
    metadata: {
      contentType: contentType, // Preserve original content type if possible, or set to jpeg/png
      // Add any other GCS metadata for the thumbnail, e.g., cache control
      metadata: {
        originalFile: filePath // Custom metadata linking to original
      }
    },
    // resumable: false // For smaller files like thumbnails, resumable might be overkill
  });

  // Create a pipeline to download the original, resize, and upload the thumbnail
  try {
    const transformer = sharp()
      .resize(THUMBNAIL_MAX_WIDTH, THUMBNAIL_MAX_HEIGHT, {
        fit: 'inside', // proportionally resize to fit within bounds
        withoutEnlargement: true, // don't enlarge if image is smaller than thumb size
      })
      // .toFormat('jpeg') // Optionally convert format, e.g., to JPEG
      // .jpeg({ quality: 80 }); // Optionally set quality if converting

    console.log(`Downloading original file: gs://${bucketName}/${filePath}`);
    const readStream = originalFile.createReadStream();
    
    readStream.pipe(transformer).pipe(thumbnailUploadStream);

    await new Promise((resolve, reject) => {
      thumbnailUploadStream.on('finish', resolve);
      thumbnailUploadStream.on('error', reject);
      // It's also good to handle errors on the readStream and transformer
      readStream.on('error', (err) => {
        console.error('Error reading original file:', err);
        reject(err);
      });
      transformer.on('error', (err) => {
        console.error('Error transforming image:', err);
        reject(err);
      });
    });

    console.log(`Successfully created thumbnail: gs://${bucketName}/${thumbnailFilePath}`);
    
    // Notify the backend that processing is complete
    await notifyBackend(
      userId, 
      imageId, 
      'processed', 
      `gs://${bucketName}/${thumbnailFilePath}`
    );

    return null; // Successfully processed

  } catch (error) {
    console.error(`Failed to process image ${filePath}:`, error);
    // Optionally, try to delete the failed thumbnail if it was partially created
    // await thumbnailFile.delete({ ignoreNotFound: true });
    
    // Notify backend of failure
    try {
      await notifyBackend(
        userId, 
        imageId, 
        'failed', 
        null, 
        error.message || 'Unknown error during image processing'
      );
    } catch (notifyError) {
      console.error('Failed to notify backend of processing failure:', notifyError);
      // Continue even if notification fails
    }
    
    throw error; // Re-throw error to mark Cloud Function execution as failed
  }
}; 