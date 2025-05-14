import { Storage } from '@google-cloud/storage';
import { getConfig } from '../config/secrets';

let storage: Storage;

export function getStorage(): Storage {
  if (!storage) {
    const config = getConfig();
    const keyJson = config.gcsServiceAccountKeyJson;
    
    if (!keyJson) {
      throw new Error('GCS service account key JSON is not configured');
    }

    try {
      const credentials = JSON.parse(keyJson);
      console.log('Service account credentials structure:', {
        hasType: 'type' in credentials,
        hasClientEmail: 'client_email' in credentials,
        hasPrivateKey: 'private_key' in credentials,
        type: credentials.type,
        fields: Object.keys(credentials)
      });
      storage = new Storage({
        credentials,
        projectId: config.gcpProjectId
      });
    } catch (error) {
      console.error('Error parsing GCS service account key JSON:', error);
      throw new Error('Failed to initialize GCS client');
    }
  }
  return storage;
}

// Helper to list all files in a bucket (useful for debugging)
export const listFiles = async (prefix?: string): Promise<string[]> => {
  const config = getConfig();
  const bucketName = config.gcsBucketName;
  
  if (!bucketName) {
    throw new Error('GCS bucket name not configured');
  }
  
  try {
    const options = prefix ? { prefix } : {};
    const [files] = await getStorage().bucket(bucketName).getFiles(options);
    
    return files.map(file => file.name);
  } catch (error) {
    console.error('Error listing files in GCS bucket:', error);
    throw new Error('Failed to list files in GCS bucket');
  }
};

export const generateSignedUrl = async (gcsPath: string): Promise<string> => {
  const config = getConfig();
  const bucketName = config.gcsBucketName;
  
  if (!bucketName) {
    throw new Error('GCS bucket name not configured');
  }

  // Extract the file path from the gcs:// URL
  const filePath = gcsPath.replace(`gs://${bucketName}/`, '');
  
  try {
    const [url] = await getStorage()
      .bucket(bucketName)
      .file(filePath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });
    
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
};

// Helper to check if a file exists in GCS
export const fileExists = async (gcsPath: string): Promise<boolean> => {
  const config = getConfig();
  const bucketName = config.gcsBucketName;
  
  if (!bucketName) {
    throw new Error('GCS bucket name not configured');
  }

  const filePath = gcsPath.replace(`gs://${bucketName}/`, '');
  
  try {
    const [exists] = await getStorage()
      .bucket(bucketName)
      .file(filePath)
      .exists();
    return exists;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}; 