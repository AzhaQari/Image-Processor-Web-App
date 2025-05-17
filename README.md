# Image Processor Web Application

## Overview

This is a full-stack web application designed to allow users to sign in via Google OAuth 2.0, upload images to Google Cloud Storage (GCS), have them processed by a Google Cloud Function, and view real-time updates on their processing status via WebSockets. The backend leverages Fastify with an OpenAPI specification for SDK generation and tRPC for specific type-safe client-side calls. Sensitive credentials are managed using Google Secret Manager.

## Features

*   **Authentication:** Secure sign-in with Google OAuth 2.0.
*   **Image Upload:** Users can upload images (JPEG, PNG, GIF).
*   **Cloud Storage:** Images are stored securely in Google Cloud Storage.
*   **Image Processing:** Uploaded images are processed by a Google Cloud Function (e.g., thumbnail generation, metadata extraction - *current function is a placeholder, processing logic TBD*).
*   **Real-Time Updates:** WebSocket integration provides live updates on image processing status.
*   **API:**
    *   RESTful API defined with OpenAPI (Swagger) for core operations, with a generated TypeScript SDK for frontend consumption.
    *   tRPC integration for selected type-safe API calls (e.g., user profile fetching).
*   **Secret Management:** Secure handling of all credentials via Google Secret Manager.
*   **Modern UI:** Frontend built with Vite, React, and styled with shadcn/ui.

## Tech Stack

*   **Frontend:**
    *   Vite
    *   React
    *   TypeScript
    *   shadcn/ui
    *   Tailwind CSS
    *   OpenAPI-generated SDK client
    *   tRPC client (`@trpc/react-query`, `@tanstack/react-query`)
*   **Backend:**
    *   Fastify
    *   Node.js
    *   TypeScript
    *   OpenAPI (Swagger) for REST API definition
    *   tRPC (`@trpc/server`) for type-safe APIs
    *   WebSockets (`ws` library, integrated with Fastify)
*   **Google Cloud Platform (GCP):**
    *   Google OAuth 2.0 (for authentication)
    *   Google Cloud Storage (for file storage)
    *   Google Cloud Functions (for image processing)
    *   Google Secret Manager (for storing secrets)
*   **Database:**
    *   In-memory store for user and image metadata (as per project allowance).

## Project Structure

The project is a monorepo managed with npm workspaces:

```
Image-Processor-Web-App/
├── gcp-functions/              # Google Cloud Function code
│   └── image-processor/
├── packages/
│   ├── backend/                # Fastify backend (Node.js, TypeScript)
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── routes/         # REST API routes
│   │   │   ├── services/
│   │   │   ├── trpc/           # tRPC routers and procedures
│   │   │   └── openapi.yaml    # OpenAPI specification
│   │   └── ...
│   └── frontend/               # Vite + React frontend
│       ├── src/
│       │   ├── assets/
│       │   ├── components/     # UI components (including shadcn/ui)
│       │   ├── contexts/       # React contexts (Auth, WebSocket)
│       │   ├── hooks/
│       │   ├── layouts/
│       │   ├── lib/            # Libraries, utilities (tRPC client, toastify)
│       │   ├── pages/          # Page components
│       │   └── sdk/            # Auto-generated OpenAPI client
│       └── ...
├── .gcloudignore
├── .gitignore
├── full-stack-webapp.md      # Project requirements
├── package.json                # Root package.json
├── package-lock.json
└── README.md
```

## Prerequisites

*   Node.js (v18.x or later recommended)
*   npm (v8.x or later, or yarn/pnpm)
*   Google Cloud SDK (gcloud CLI) authenticated and configured.
*   A Google Cloud Platform project.

## Google Cloud Setup

Follow these steps to configure the necessary GCP services:

### 1. Create/Select a GCP Project

*   Go to the [Google Cloud Console](https://console.cloud.google.com/).
*   Create a new project or select an existing one. Note your **Project ID**.

### 2. Enable APIs

Enable the following APIs for your project:
*   IAM API (`iam.googleapis.com`)
*   Secret Manager API (`secretmanager.googleapis.com`)
*   Cloud Storage API (`storage-component.googleapis.com`)
*   Cloud Functions API (`cloudfunctions.googleapis.com`)
*   Cloud Build API (`cloudbuild.googleapis.com`) (often needed for Cloud Functions deployment)
*   Identity Platform API (`identitytoolkit.googleapis.com`) (may be enabled by OAuth config)
*   Google People API (`people.googleapis.com`) (used by `googleapis` library for user profile)

You can enable them via the "APIs & Services" > "Library" section in the Cloud Console.

### 3. Configure OAuth 2.0 Credentials

*   Go to "APIs & Services" > "OAuth consent screen".
    *   Choose "External" user type.
    *   Fill in the required application details (app name, user support email, developer contact).
    *   Add Scopes: `openid`, `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile`.
*   Go to "APIs & Services" > "Credentials".
    *   Click "+ CREATE CREDENTIALS" > "OAuth client ID".
    *   Application type: "Web application".
    *   Name: e.g., "Image Processor Web App Client".
    *   Authorized JavaScript origins:
        *   `http://localhost:5173` (for frontend development)
    *   Authorized redirect URIs:
        *   `http://localhost:3000/api/auth/google/callback` (for backend development)
    *   Click "CREATE". Note your **Client ID** and **Client Secret**.

### 4. Create a Service Account (for GCS & Backend)

The backend service needs credentials to interact with GCS and Secret Manager.
*   Go to "IAM & Admin" > "Service Accounts".
*   Click "+ CREATE SERVICE ACCOUNT".
*   Name: e.g., `image-processor-backend-sa`
*   Grant roles:
    *   `Secret Manager Secret Accessor` (to access secrets)
    *   `Storage Object Admin` (to read/write to GCS buckets)
    *   Optionally, if the Cloud Function will be invoked by this service account or if this SA is used by the GCF itself: `Cloud Functions Invoker` or `Cloud Functions Developer`.
*   Click "DONE".
*   Find the created service account, click on it, go to the "KEYS" tab.
*   Click "ADD KEY" > "Create new key".
*   Choose "JSON" as the key type and click "CREATE". A JSON key file will be downloaded. **Secure this file.** The *content* of this JSON file will be stored in Secret Manager.

### 5. Create Google Cloud Storage (GCS) Bucket

*   Go to "Cloud Storage" > "Buckets".
*   Click "CREATE BUCKET".
*   Choose a unique **Bucket name**.
*   Select a region and other settings as per your preference.
*   Ensure "Fine-grained" access control is selected if you need per-object permissions (though "Uniform" is often simpler if bucket-level permissions are sufficient). The provided service account will have access.

### 6. Configure Google Secret Manager

Store the following secrets in Secret Manager. The backend application will fetch these at startup.
*   `GOOGLE_CLIENT_ID`: Your OAuth Client ID.
*   `GOOGLE_CLIENT_SECRET`: Your OAuth Client Secret.
*   `SESSION_SECRET`: A long, random string for securing user sessions (e.g., generate one using a password manager or `openssl rand -base64 32`).
*   `GCS_BUCKET_NAME`: The name of the GCS bucket you created.
*   `GCS_SERVICE_ACCOUNT_KEY_JSON`: The *entire content* of the JSON service account key file you downloaded.

To add a secret:
*   Go to "Security" > "Secret Manager".
*   Click "CREATE SECRET".
*   Enter the secret name (e.g., `GOOGLE_CLIENT_ID`).
*   Paste the secret value.
*   Click "CREATE SECRET".
*   Repeat for all required secrets. Ensure the service account used by the backend (`image-processor-backend-sa` or similar) has the "Secret Manager Secret Accessor" role on these secrets or the project.

### 7. Configure Google Cloud Function

The image processing Cloud Function is located in `gcp-functions/image-processor`.
*   **Trigger:** This function is currently designed to be triggered by an HTTP request (as per the placeholder `index.js`). For Level 2/3, this would typically be a GCS trigger (on file finalize in the upload bucket).
*   **Runtime:** Node.js (e.g., Node.js 18 or 20).
*   **Entry point:** `processImage` (as per the placeholder `index.js`).
*   **Permissions:** The Cloud Function will need permissions to read from and write to the GCS bucket. This is usually handled by assigning a runtime service account to the function that has "Storage Object Admin" or more specific "Storage Object Creator" and "Storage Object Viewer" roles on the bucket.
*   **Deployment:** You can deploy it using the gcloud CLI:
    ```bash
    cd gcp-functions/image-processor
    gcloud functions deploy image-processor-function \
      --runtime nodejs18 \
      --trigger-http \ # Or --trigger-bucket YOUR_BUCKET_NAME for GCS trigger
      --entry-point processImage \
      --region YOUR_REGION \
      --project YOUR_PROJECT_ID \
      --allow-unauthenticated # For HTTP trigger if called directly from GCS event forwarding or client
      # --service-account YOUR_FUNCTION_SERVICE_ACCOUNT_EMAIL # If using a specific SA
    ```
    *Note: The current `index.js` is a placeholder. Actual processing logic needs to be implemented.*

## Local Development Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd Image-Processor-Web-App
```

### 2. Install Dependencies
This project is a monorepo using npm workspaces.
```bash
npm install
```
This will install dependencies for the root, `packages/backend`, and `packages/frontend`.

### 3. Environment Variables
The backend is configured to load secrets directly from Google Secret Manager. Ensure your `gcloud` CLI is authenticated with an account that has permission to access these secrets (or set up Application Default Credentials correctly).

You might need to set `GCP_PROJECT_ID` as an environment variable if the backend cannot auto-detect it:
*   Create a `.env` file in `packages/backend/` (this file is in `.gitignore`):
    ```env
    GCP_PROJECT_ID=your-gcp-project-id
    # PORT=3000 # Optional, defaults to 3000
    ```

### 4. Running the Backend
```bash
npm run dev --workspace=backend
```
The backend server will start, typically on `http://localhost:3000`. It will attempt to load secrets from Google Secret Manager upon startup.

### 5. Running the Frontend
Open a new terminal:
```bash
npm run dev --workspace=frontend
```
The frontend development server will start, typically on `http://localhost:5173`.

### 6. Accessing the Application
*   Open your browser and navigate to `http://localhost:5173`.

## Architecture Summary

This application follows a modern full-stack architecture:

*   **Frontend:** A Single Page Application (SPA) built with Vite and React.
    *   **UI:** shadcn/ui components and Tailwind CSS for styling.
    *   **State Management:** React Context API (for Auth and WebSockets).
    *   **API Communication:**
        *   **OpenAPI SDK:** A TypeScript SDK generated from the backend's OpenAPI specification is used for most RESTful API calls (e.g., image upload, listing images, logout).
        *   **tRPC Client:** Integrated with `@tanstack/react-query` for type-safe calls to specific tRPC procedures on the backend (e.g., fetching user profile information).
*   **Backend:** A Node.js server built with Fastify.
    *   **API Definition:**
        *   **OpenAPI (Swagger):** The primary API for CRUD operations is defined in `openapi.yaml`, enabling SDK generation.
        *   **tRPC:** Provides type-safe, RPC-style API endpoints. The `user.getMe` endpoint is an example, offering a direct, type-safe way for the frontend to fetch user data.
    *   **Authentication:** Google OAuth 2.0 flow managed by the backend, with user sessions stored using `@fastify/session`.
    *   **WebSockets:** Real-time communication for image processing status updates is handled via a WebSocket server integrated with Fastify.
*   **GCP Services:**
    *   **Google OAuth 2.0:** Handles user authentication.
    *   **Google Cloud Storage (GCS):** Stores uploaded images.
    *   **Google Cloud Functions:** Intended for serverless image processing tasks.
    *   **Google Secret Manager:** Securely stores all application secrets.

### OpenAPI + tRPC Usage

The project demonstrates a hybrid approach:
*   **OpenAPI & Generated SDK:** Used for well-defined, resource-oriented RESTful endpoints (image uploads, listing images). This provides a clear contract and allows easy SDK generation for various clients.
*   **tRPC:** Used for specific procedures where end-to-end type safety and a more RPC-like developer experience are beneficial. Currently, this includes fetching the authenticated user's profile (`user.getMe`). This approach allows for rapid iteration on such endpoints without needing to regenerate an SDK for every minor change.

This combination allows leveraging the strengths of both approaches: OpenAPI for broad API contracts and SDKs, and tRPC for highly type-safe, specialized client-server interactions.

## API Documentation

The OpenAPI (Swagger) documentation for the RESTful API is available when the backend is running:
*   **URL:** [http://localhost:3000/documentation](http://localhost:3000/documentation)

## Loom Video Walkthrough

*   https://www.loom.com/share/d908fa0943ba4822a85b52568dc3331d?sid=7b909924-4c6e-4685-92bd-04fd971ebf49

---

This README provides a comprehensive guide to understanding, setting up, and running the Image Processor Web Application.
