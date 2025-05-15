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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = void 0;
exports.loadSecrets = loadSecrets;
const dotenv_1 = __importDefault(require("dotenv"));
const secret_manager_1 = require("@google-cloud/secret-manager");
// Load environment variables from .env file
dotenv_1.default.config();
const client = new secret_manager_1.SecretManagerServiceClient();
const appConfig = {};
// Helper function to access a secret's latest version
function accessSecretVersion(name) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const [version] = yield client.accessSecretVersion({
                name: name,
            });
            const payload = (_b = (_a = version.payload) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.toString();
            if (payload) {
                return payload;
            }
            console.warn(`Secret ${name} has no payload or data.`);
            return undefined;
        }
        catch (error) {
            // Check if the error is due to the secret not being found (gRPC status code 5)
            if (error && error.code === 5) {
                console.warn(`Optional secret ${name} not found or has no versions. This might be okay if it's not required.`);
                return undefined; // Return undefined for NOT_FOUND errors, allowing optional secrets
            }
            else {
                console.error(`Failed to access secret ${name}:`, error);
                throw error; // Re-throw for other types of errors
            }
        }
    });
}
function loadSecrets() {
    return __awaiter(this, void 0, void 0, function* () {
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
            }
            else {
                // As a last resort, prompt user to set environment variable
                throw new Error('GCP_PROJECT_ID not found. Please set GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT environment variable.');
            }
        }
        catch (error) {
            console.error('Failed to determine GCP project ID:', error);
            throw new Error('Critical: GCP_PROJECT_ID could not be determined. Please set GCP_PROJECT_ID environment variable.');
        }
        const projectId = appConfig.gcpProjectId;
        if (!projectId) {
            throw new Error('GCP Project ID is not available. Cannot load secrets.');
        }
        console.log(`Loading secrets for project: ${projectId}`);
        const secretsToLoad = [
            { key: 'googleClientId', name: 'GOOGLE_CLIENT_ID', required: true },
            { key: 'googleClientSecret', name: 'GOOGLE_CLIENT_SECRET', required: true },
            { key: 'gcsBucketName', name: 'GCS_BUCKET_NAME', required: true },
            { key: 'sessionSecret', name: 'SESSION_SECRET', required: true },
            // GCP_PROJECT_ID is already handled
            { key: 'gcsServiceAccountKeyJson', name: 'GCS_SERVICE_ACCOUNT_KEY_JSON', required: true },
        ];
        for (const secretInfo of secretsToLoad) {
            const secretFullName = `projects/${projectId}/secrets/${secretInfo.name}/versions/latest`;
            console.log(`Attempting to load secret: ${secretInfo.name} (from ${secretFullName})`);
            const value = yield accessSecretVersion(secretFullName);
            if (value) {
                appConfig[secretInfo.key] = value;
            }
            else if (secretInfo.required) {
                throw new Error(`Required secret ${secretInfo.name} could not be loaded.`);
            }
        }
        // Validate that required secrets are loaded
        if (!appConfig.googleClientId || !appConfig.googleClientSecret || !appConfig.gcsBucketName || !appConfig.sessionSecret || !appConfig.gcsServiceAccountKeyJson) {
            throw new Error('One or more required application secrets could not be loaded. Check logs.');
        }
        console.log('Application secrets loaded successfully.');
        // console.log('Loaded config:', appConfig); // Be careful logging secrets, even locally
    });
}
// Export the loaded config for use in other modules
const getConfig = () => {
    // Ensure secrets are loaded before allowing access, though loadSecrets should be called at startup
    if (Object.keys(appConfig).length === 0 || !appConfig.gcpProjectId) {
        // This check is a safeguard; primary loading is via loadSecrets() at app start.
        // Synchronous getConfig won't wait for async loadSecrets. Consider implications.
        console.warn('getConfig() called before loadSecrets() completed or GCP_PROJECT_ID is missing. Config may be incomplete.');
    }
    return Object.freeze(Object.assign({}, appConfig)); // Return a frozen copy
};
exports.getConfig = getConfig;
