import dotenv from 'dotenv';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Load environment variables from .env file
dotenv.config();

const client = new SecretManagerServiceClient();

interface AppConfig {
  googleClientId?: string;
  googleClientSecret?: string;
  gcsBucketName?: string;
  gcpProjectId?: string;
  sessionSecret?: string;
  gcsServiceAccountKeyJson?: string; // Optional, for local dev
}

const appConfig: AppConfig = {};

// Helper function to access a secret's latest version
async function accessSecretVersion(name: string): Promise<string | undefined> {
  try {
    const [version] = await client.accessSecretVersion({
      name: name,
    });
    const payload = version.payload?.data?.toString();
    if (payload) {
      return payload;
    }
    console.warn(`Secret ${name} has no payload or data.`);
    return undefined;
  } catch (error: any) {
    // Check if the error is due to the secret not being found (gRPC status code 5)
    if (error && error.code === 5) { 
      console.warn(`Optional secret ${name} not found or has no versions. This might be okay if it's not required.`);
      return undefined; // Return undefined for NOT_FOUND errors, allowing optional secrets
    } else {
      console.error(`Failed to access secret ${name}:`, error);
      throw error; // Re-throw for other types of errors
    }
  }
}

export async function loadSecrets(): Promise<void> {
  // Ensure GCP_PROJECT_ID is loaded first, as it's needed to construct full secret names
  // For local development, ensure GOOGLE_APPLICATION_CREDENTIALS is set, or you are logged in via gcloud auth application-default login
  // Alternatively, for explicit project ID in code (less common for secret paths):
  console.warn('GCP_PROJECT_ID environment variable is not set. Attempting to fetch from Secret Manager.');
  // If GCP_PROJECT_ID itself is in Secret Manager and you know its full path without needing it for others
  try {
    // Try to load from environment variables first
    const projectId = process.env.GCP_PROJECT_ID;
    if (projectId) {
      appConfig.gcpProjectId = projectId;
      console.log(`Using project ID from environment: ${projectId}`);
    } else {
      // As a last resort, prompt user to set environment variable
      throw new Error('GCP_PROJECT_ID not found. Please set GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT environment variable.');
    }
  } catch (error) {
    console.error('Failed to determine GCP project ID:', error);
    throw new Error('Critical: GCP_PROJECT_ID could not be determined. Please set GCP_PROJECT_ID environment variable.');
  }

  const projectId = appConfig.gcpProjectId;
  if (!projectId) {
    throw new Error('GCP Project ID is not available. Cannot load secrets.');
  }

  console.log(`Loading secrets for project: ${projectId}`);

  const secretsToLoad: { key: keyof AppConfig; name: string; required: boolean }[] = [
    { key: 'googleClientId', name: 'GOOGLE_CLIENT_ID', required: true },
    { key: 'googleClientSecret', name: 'GOOGLE_CLIENT_SECRET', required: true },
    { key: 'gcsBucketName', name: 'GCS_BUCKET_NAME', required: true },
    { key: 'sessionSecret', name: 'SESSION_SECRET', required: true },
    // GCP_PROJECT_ID is already handled
    // { key: 'gcsServiceAccountKeyJson', name: 'GCS_SERVICE_ACCOUNT_KEY_JSON', required: false }, // Optional
  ];

  for (const secretInfo of secretsToLoad) {
    const secretFullName = `projects/${projectId}/secrets/${secretInfo.name}/versions/latest`;
    console.log(`Attempting to load secret: ${secretInfo.name} (from ${secretFullName})`);
    const value = await accessSecretVersion(secretFullName);
    if (value) {
      appConfig[secretInfo.key] = value;
    } else if (secretInfo.required) {
      throw new Error(`Required secret ${secretInfo.name} could not be loaded.`);
    }
  }

  // Validate that required secrets are loaded
  if (!appConfig.googleClientId || !appConfig.googleClientSecret || !appConfig.gcsBucketName || !appConfig.sessionSecret) {
    throw new Error('One or more required application secrets could not be loaded. Check logs.');
  }

  console.log('Application secrets loaded successfully.');
  // console.log('Loaded config:', appConfig); // Be careful logging secrets, even locally
}

// Export the loaded config for use in other modules
export const getConfig = (): Readonly<AppConfig> => {
  // Ensure secrets are loaded before allowing access, though loadSecrets should be called at startup
  if (Object.keys(appConfig).length === 0 || !appConfig.gcpProjectId) {
    // This check is a safeguard; primary loading is via loadSecrets() at app start.
    // Synchronous getConfig won't wait for async loadSecrets. Consider implications.
    console.warn('getConfig() called before loadSecrets() completed or GCP_PROJECT_ID is missing. Config may be incomplete.');
  }
  return Object.freeze({ ...appConfig }); // Return a frozen copy
}; 