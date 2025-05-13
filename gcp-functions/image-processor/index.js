const { Storage } = require('@google-cloud/storage');
const sharp = require('sharp');
const path = require('path');

const storage = new Storage();

// Configuration for thumbnails
const THUMBNAIL_MAX_WIDTH = 200;
const THUMBNAIL_MAX_HEIGHT = 200;
const THUMBNAIL_PREFIX = 'thumbnails/';

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

  const bucket = storage.bucket(bucketName);
  const originalFile = bucket.file(filePath);
  
  // Create a name for the thumbnail
  const fileName = path.basename(filePath);
  const thumbnailFilePath = `${THUMBNAIL_PREFIX}${fileName}`;
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
    
    // Here, you would typically notify your backend that processing is complete.
    // For example, by making an HTTP request or publishing to Pub/Sub.
    // We will add this in a later step.
    // Example: await notifyBackend(fileId, thumbnailFilePath);

    return null; // Successfully processed

  } catch (error) {
    console.error(`Failed to process image ${filePath}:`, error);
    // Optionally, try to delete the failed thumbnail if it was partially created
    // await thumbnailFile.delete({ ignoreNotFound: true });
    throw error; // Re-throw error to mark Cloud Function execution as failed
  }
}; 