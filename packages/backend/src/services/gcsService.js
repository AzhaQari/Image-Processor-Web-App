"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileExists = exports.listFiles = exports.generateSignedUrl = void 0;
exports.getStorage = getStorage;
const storage_1 = require("@google-cloud/storage");
const secrets_1 = require("../config/secrets");
let storage;
function getStorage() {
    if (!storage) {
        const config = (0, secrets_1.getConfig)();
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
            storage = new storage_1.Storage({
                credentials,
                projectId: config.gcpProjectId
            });
        }
        catch (error) {
            console.error('Error parsing GCS service account key JSON:', error);
            throw new Error('Failed to initialize GCS client');
        }
    }
    return storage;
}
const generateSignedUrl = (gcsPath) => __awaiter(void 0, void 0, void 0, function* () {
    const config = (0, secrets_1.getConfig)();
    const bucketName = config.gcsBucketName;
    if (!bucketName) {
        throw new Error('GCS bucket name not configured');
    }
    // Validate and clean the GCS path
    if (!gcsPath.startsWith(`gs://${bucketName}/`)) {
        throw new Error(`Invalid GCS path format. Expected gs://${bucketName}/path/to/file`);
    }
    // Extract and clean the file path
    const filePath = gcsPath
        .replace(`gs://${bucketName}/`, '')
        .trim()
        .replace(/\/{2,}/g, '/') // Replace multiple consecutive slashes with single slash
        .replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
    if (!filePath) {
        throw new Error('Invalid file path: path is empty after cleaning');
    }
    try {
        console.log(`Generating signed URL for bucket: ${bucketName}, file: ${filePath}`);
        const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        };
        const [url] = yield getStorage()
            .bucket(bucketName)
            .file(filePath)
            .getSignedUrl(options);
        console.log(`Generated signed URL: ${url}`);
        return url;
    }
    catch (error) {
        console.error('Error generating signed URL:', error);
        throw error;
    }
});
exports.generateSignedUrl = generateSignedUrl;
// Helper to list all files in a bucket (useful for debugging)
const listFiles = (prefix) => __awaiter(void 0, void 0, void 0, function* () {
    const config = (0, secrets_1.getConfig)();
    const bucketName = config.gcsBucketName;
    if (!bucketName) {
        throw new Error('GCS bucket name not configured');
    }
    try {
        const options = prefix ? { prefix } : {};
        const [files] = yield getStorage().bucket(bucketName).getFiles(options);
        return files.map(file => file.name);
    }
    catch (error) {
        console.error('Error listing files in GCS bucket:', error);
        throw new Error('Failed to list files in GCS bucket');
    }
});
exports.listFiles = listFiles;
// Helper to check if a file exists in GCS
const fileExists = (gcsPath) => __awaiter(void 0, void 0, void 0, function* () {
    const config = (0, secrets_1.getConfig)();
    const bucketName = config.gcsBucketName;
    if (!bucketName) {
        throw new Error('GCS bucket name not configured');
    }
    const filePath = gcsPath.replace(`gs://${bucketName}/`, '').trim();
    try {
        const [exists] = yield getStorage()
            .bucket(bucketName)
            .file(filePath)
            .exists();
        return exists;
    }
    catch (error) {
        console.error('Error checking file existence:', error);
        return false;
    }
});
exports.fileExists = fileExists;
