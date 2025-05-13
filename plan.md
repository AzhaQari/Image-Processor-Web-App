# Full-Stack Image Processor Web App: Project Plan

This document outlines the step-by-step plan to develop the Full-Stack Image Processor Web Application as per the requirements in `full-stack-webapp.md`.

## Phase 1: Project Foundation & Initial Backend Setup

1.  **Version Control & Project Structure:**
    *   Initialize a new Git repository.
    *   Create a private repository on a platform like GitHub and invite the specified collaborator.
    *   Set up a monorepo structure (e.g., using pnpm workspaces, Yarn workspaces, or Lerna) to manage `backend` and `frontend` packages separately but within the same project.
        *   `mkdir Image-Processor-Web-App && cd Image-Processor-Web-App`
        *   `git init`
        *   `mkdir packages && cd packages && mkdir backend frontend`
        *   Initialize `pnpm-workspace.yaml` or similar if using pnpm.
    *   Create an initial `README.md` at the root, outlining the project's purpose (to be expanded later).
    *   Create a `.gitignore` file with common ignores for Node.js, OS-specific files, and editor files.

2.  **Backend: Fastify & TypeScript Setup:**
    *   Navigate to the `packages/backend` directory.
    *   Initialize a new Node.js project: `pnpm init` (or `npm init -y` / `yarn init -y`).
    *   Install Fastify: `pnpm add fastify`.
    *   Install TypeScript and related development dependencies: `pnpm add -D typescript ts-node @types/node nodemon`.
    *   Initialize a `tsconfig.json` file: `npx tsc --init`. Configure it for a modern Node.js environment (e.g., `target: "ES2020"`, `module: "CommonJS"` or `"NodeNext"` if using ESM, `outDir`, `rootDir`).
    *   Create a basic Fastify server in `src/index.ts` (e.g., a simple "Hello World" route).
    *   Add scripts to `package.json` for running (`dev`) and building (`build`) the backend.

3.  **Backend: OpenAPI (Swagger) Specification - Initial Draft:**
    *   Create an `openapi.yaml` (or `openapi.json`) file in the `packages/backend/src` directory (or a dedicated `specs` folder).
    *   Define initial API information (title, version, description).
    *   Draft basic paths and operations for core functionalities (these will be expanded):
        *   `POST /auth/google` (Initiate Google OAuth)
        *   `GET /auth/google/callback` (Handle OAuth callback)
        *   `POST /auth/logout`
        *   `GET /users/me` (Get current user profile - potentially for tRPC later)
        *   `POST /images/upload` (Protected: Upload image)
        *   `GET /images` (Protected: List user's images)
    *   Define basic schemas for requests and responses related to these initial endpoints.
    *   Integrate an OpenAPI/Swagger UI plugin with Fastify (e.g., `fastify-swagger`) to serve the API documentation visually during development.

4.  **Backend: SDK Generation Setup:**
    *   Choose an OpenAPI client generator (e.g., `openapi-typescript-codegen`, `openapi-generator-cli`).
    *   Install the chosen generator as a dev dependency in the root or backend package.
    *   Create a script (e.g., in root `package.json` or `backend/package.json`) to generate the TypeScript SDK from `openapi.yaml`.
    *   Configure the script to output the generated SDK to a suitable location, perhaps a shared package or directly into `packages/frontend/src/sdk`.

## Phase 2: Google Cloud Platform (GCP) Core Services Setup

1.  **GCP Project & API Enablement:**
    *   Create a new GCP project or select an existing one.
    *   Enable the following APIs in the GCP Console:
        *   IAM Service Account Credentials API (if creating service account keys, though prefer workload identity federation if possible for GKE/Cloud Run)
        *   Google People API (if fetching profile info beyond basic OpenID scopes)
        *   Cloud Storage API
        *   Cloud Functions API
        *   Secret Manager API
        *   (If using Cloud SQL: Cloud SQL Admin API)
        *   (If using Pub/Sub for function notifications: Pub/Sub API)

2.  **Secret Management (Google Secret Manager):**
    *   Identify initial secrets needed:
        *   `GOOGLE_CLIENT_ID`
        *   `GOOGLE_CLIENT_SECRET`
        *   `GCS_BUCKET_NAME`
        *   `SESSION_SECRET` (for backend session management)
        *   `GCP_PROJECT_ID`
        *   `GCS_SERVICE_ACCOUNT_KEY_JSON` (if using service account keys for local dev; store the JSON content as a secret). **Note:** For production, prefer Workload Identity Federation.
    *   Create these secrets in Google Secret Manager within your GCP project.
    *   Implement logic in the backend (`packages/backend/src/config/secrets.ts` or similar) to fetch these secrets on application startup using the `@google-cloud/secret-manager` library.
    *   Ensure the application has appropriate permissions to access these secrets (e.g., grant the "Secret Manager Secret Accessor" role to the service account running the backend, or your user account for local dev).
    *   Document the secret names and setup process in `README.md`.

3.  **Google Cloud Storage (GCS) Setup:**
    *   Create a GCS bucket for image uploads. Choose a globally unique name, region, and storage class.
    *   Configure permissions for the bucket. The backend service (or its service account) will need write access. The Cloud Function will need read access.
    *   Note the `GCS_BUCKET_NAME` and store it in Secret Manager.

4.  **Google OAuth 2.0 Credentials Setup:**
    *   In the GCP Console (APIs & Services > Credentials), create OAuth 2.0 Client ID credentials.
    *   Select "Web application" as the application type.
    *   Configure authorized JavaScript origins (e.g., `http://localhost:5173` for Vite frontend).
    *   Configure authorized redirect URIs (e.g., `http://localhost:3000/api/auth/google/callback` for the backend).
    *   Note the `Client ID` and `Client Secret`. Store them securely in Google Secret Manager (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

## Phase 3: Authentication (Google OAuth 2.0)

1.  **Backend: OAuth Flow Implementation (Fastify):**
    *   Install necessary libraries: `pnpm add googleapis @fastify/cookie @fastify/session` (or a JWT library like `@fastify/jwt`).
    *   Implement the `/api/auth/google` route:
        *   Generate the Google OAuth2 consent screen URL using the `googleapis` library and the fetched `GOOGLE_CLIENT_ID`.
        *   Redirect the user to this URL.
    *   Implement the `/api/auth/google/callback` route:
        *   Handle the callback from Google, exchanging the authorization code for tokens (access token, refresh token, ID token).
        *   Verify the ID token.
        *   Extract user profile information (email, name, Google ID).
        *   Store user information and tokens:
            *   **Session Management:** Use `@fastify/session` with `@fastify/cookie`. Store user ID or essential profile info in the session. Refresh tokens should be stored securely if needed (e.g., encrypted in the session or a secure backend store if long-lived access is required).
            *   **In-Memory User Store:** Create a simple in-memory array/map in the backend to store user details keyed by Google ID or a generated internal user ID. (e.g., `let users = [];`)
        *   Redirect the user to the frontend dashboard upon successful authentication.
    *   Implement an `/api/auth/logout` route:
        *   Destroy the user's session.
        *   Redirect to the frontend landing page.
    *   Implement an `/api/users/me` route (can be OpenAPI or tRPC):
        *   Return the current authenticated user's profile information from the session/in-memory store.

2.  **Backend: Protecting Routes:**
    *   Create a Fastify authentication hook/middleware.
    *   This hook checks if `request.session.user` (or equivalent JWT validation) exists.
    *   If not authenticated, reply with a `401 Unauthorized` error.
    *   Apply this hook to routes that require authentication (e.g., image upload, image list).

3.  **Frontend: Project Setup (Vite + React + shadcn/ui):**
    *   Navigate to `packages/frontend`.
    *   Initialize Vite + React + TypeScript: `pnpm create vite . --template react-ts`.
    *   Install `shadcn/ui`: Follow `shadcn/ui` installation instructions (`npx shadcn-ui@latest init`). Configure `tailwind.config.js`, `globals.css`, `components.json`.
    *   Install React Router: `pnpm add react-router-dom`.
    *   Install an HTTP client like `axios` (or rely on the generated SDK's fetch mechanism): `pnpm add axios`.
    *   Install state management if desired (e.g., Zustand `pnpm add zustand`, or use React Context).

4.  **Frontend: UI for Authentication:**
    *   Set up basic routing (`App.tsx`, `main.tsx`) with `react-router-dom`:
        *   `/` (Landing Page)
        *   `/dashboard` (Protected Route)
    *   Create `LandingPage.tsx`:
        *   Display a "Sign in with Google" button (`shadcn/ui Button`).
        *   On click, redirect the browser to `http://localhost:3000/api/auth/google`.
    *   Create `AuthContext.tsx` (or similar state management):
        *   Manage authentication state (e.g., `isAuthenticated`, `user`).
        *   Provide a function to fetch the current user (`/api/users/me`) on app load or after login to confirm session.
    *   Create a `ProtectedRoute.tsx` component:
        *   If not authenticated, redirect to `/`.
        *   Otherwise, render the child component.
    *   Update `App.tsx` to use `AuthContext` and `ProtectedRoute` for `/dashboard`.

## Phase 4: Image Upload & GCS Integration

1.  **Backend: Image Upload Endpoint (Fastify):**
    *   Install `@fastify/multipart` for handling file uploads: `pnpm add @fastify/multipart`.
    *   Install Google Cloud Storage client library: `pnpm add @google-cloud/storage`.
    *   Implement the `POST /api/images/upload` endpoint (defined in OpenAPI):
        *   Protect this route using the authentication hook.
        *   Use `@fastify/multipart` to handle `multipart/form-data` requests.
        *   Validate file type and size.
        *   Use the `@google-cloud/storage` library to upload the image stream to the GCS bucket (fetched from `GCS_BUCKET_NAME` secret).
        *   Generate a unique filename (e.g., `userId_timestamp_originalName`).
        *   Store image metadata (filename, GCS path, userId, upload timestamp, initial status "uploaded") in an in-memory store (e.g., `let images = [];`).
        *   Respond with success or error message.

2.  **Frontend: Image Upload UI (Dashboard):**
    *   Create `DashboardPage.tsx`.
    *   Use `shadcn/ui` components:
        *   Input type file or a drag-and-drop component (e.g., using `react-dropzone` styled with `shadcn/ui`).
        *   Button for triggering upload.
    *   On file selection/drop:
        *   Use the generated OpenAPI SDK (or `axios`) to make a `POST` request to `/api/images/upload` with the file data as `FormData`.
        *   Include authentication (cookies should be sent automatically by the browser if the backend sets them correctly).
        *   Display a progress bar (`shadcn/ui Progress`) during upload (requires backend support or client-side estimation).
        *   Handle success: Update UI to show the image is uploaded.
        *   Handle errors: Display an error message (`shadcn/ui Alert` or `Toast`).

3.  **Backend: List Images Endpoint (Fastify):**
    *   Implement `GET /api/images` endpoint (defined in OpenAPI):
        *   Protect this route.
        *   Retrieve the list of images for the authenticated user from the in-memory store.
        *   Return the list.

4.  **Frontend: Display Uploaded Images (Dashboard):**
    *   On `DashboardPage.tsx` load:
        *   Fetch the list of images using the SDK for `/api/images`.
        *   Display images in a list or gallery format (`shadcn/ui Card`, `Table`, or custom layout).
        *   For each image, display its current status ("Uploaded", "Processing...", "Processed") and any available metadata. Initially, all new images will show "Uploaded".

## Phase 5: Image Processing (Cloud Function) & Real-Time Updates (WebSockets)

1.  **Cloud Function: Image Processing:**
    *   Create a new directory for the Cloud Function (e.g., `gcp-functions/image-processor`).
    *   Initialize it as a Node.js project (or Python, etc.).
    *   Install GCS client library and an image processing library (e.g., `sharp` for Node.js, `Pillow` for Python).
    *   Write the function logic:
        *   Trigger: GCS `google.storage.object.finalize` event on the uploads bucket.
        *   Input: Event data containing bucket and file name.
        *   Action:
            *   Download the image from GCS.
            *   Process it (e.g., create a thumbnail, extract EXIF data, apply a simple filter).
            *   Upload the processed image back to GCS (e.g., to a different path/bucket or with a suffix like `_thumbnail`).
            *   **Crucially:** Notify the backend that processing is complete. This can be done by:
                *   Making an HTTP POST request to a new, secure endpoint on your Fastify backend (e.g., `/api/images/:imageId/processed`). This endpoint would update the in-memory store and then trigger WebSocket broadcast.
                *   Or, publishing a message to a Pub/Sub topic that the backend subscribes to.
    *   Configure permissions for the Cloud Function's service account to read from the source GCS bucket and write to the destination bucket/path, and to invoke the backend endpoint or publish to Pub/Sub.
    *   Deploy the Cloud Function.

2.  **Backend: WebSocket Setup (Fastify):**
    *   Install a WebSocket library for Fastify: `pnpm add fastify-websocket`.
    *   Initialize `fastify-websocket` in your Fastify server.
    *   Create a WebSocket route (e.g., `/ws`).
    *   When a client connects:
        *   Authenticate the WebSocket connection if possible (e.g., using a token sent in the handshake, or associate with existing HTTP session).
        *   Store the connection, perhaps mapped to a `userId`, to send targeted updates.

3.  **Backend: Handling "Processing Complete" Notification:**
    *   Create the endpoint the Cloud Function will call (e.g., `POST /api/images/:imageId/processed`).
    *   This endpoint should:
        *   Be secured (e.g., expect a pre-shared key or use IAM authentication if called by the Cloud Function service account).
        *   Update the status of the image in the in-memory store (e.g., to "Processed") and store any new metadata (e.g., thumbnail URL, EXIF data).
        *   Find the WebSocket connection(s) for the user who owns the image.
        *   Send a message via WebSocket to that user's client(s) with the updated image information (ID, new status, metadata).

4.  **Frontend: WebSocket Integration:**
    *   On `DashboardPage.tsx` load (and after user is authenticated):
        *   Establish a WebSocket connection to the backend (`ws://localhost:3000/ws`).
        *   Listen for messages from the server.
        *   When a message arrives indicating an image has been processed:
            *   Find the corresponding image in the local state/UI.
            *   Update its status to "Processed" and display new metadata/thumbnail.
            *   Show a toast notification (`shadcn/ui Toast`) indicating completion.
            *   This update should happen in real-time without a page refresh.

## Phase 6: tRPC Integration

1.  **Backend: tRPC Setup (Fastify):**
    *   Install tRPC server libraries: `pnpm add @trpc/server zod`.
    *   Install Fastify tRPC adapter: `pnpm add @trpc/server/adapters/fastify`.
    *   Create a tRPC router (`packages/backend/src/trpc/router.ts`):
        *   Define a context function that provides access to the request, session, and in-memory stores.
        *   Create a sample procedure, e.g., for fetching user profile or managing a tRPC-specific feature:
            ```typescript
            // Example tRPC router
            import { initTRPC } from '@trpc/server';
            import { z } from 'zod';
            // const t = initTRPC.context<Context>().create(); // Define Context
            const t = initTRPC.create(); // Basic if no context needed for this example
            export const appRouter = t.router({
              getUserProfile: t.procedure
                .input(z.object({ userId: z.string() }).optional()) // Or get from context
                .query(({ input, ctx }) => {
                  // const userIdToFetch = input?.userId || ctx.session.user.id;
                  // return inMemoryUserStore.find(u => u.id === userIdToFetch);
                  return { id: input?.userId || 'tempUser', name: 'Test User via tRPC', email: 'trpc@example.com' };
                }),
              // Add more procedures for auth or user profile as demonstration
            });
            export type AppRouter = typeof appRouter;
            ```
    *   Integrate the tRPC router with Fastify using the adapter on a specific path (e.g., `/trpc`).

2.  **Frontend: tRPC Client Setup:**
    *   Install tRPC client libraries: `pnpm add @trpc/client @trpc/react-query @tanstack/react-query`.
    *   Create a tRPC client configuration (`packages/frontend/src/trpc/client.ts`):
        *   Point it to the backend tRPC endpoint (`http://localhost:3000/trpc`).
        *   Integrate with `@tanstack/react-query` by wrapping the app in `QueryClientProvider`.
    *   Import the `AppRouter` type from the backend (can be done via relative paths in a monorepo, or by publishing the backend types as a package).

3.  **Frontend: Using tRPC Procedures:**
    *   In a React component (e.g., a new `UserProfileTRPC.tsx` component or integrate into `DashboardPage`):
        *   Use hooks from `@trpc/react-query` (e.g., `trpc.getUserProfile.useQuery()`) to call tRPC procedures.
        *   Demonstrate type-safe data fetching and display the results.
        *   Explain in `README.md` or Loom video how tRPC is used alongside the OpenAPI-generated SDK, and for what purposes (e.g., user profile, specialized calls).

## Phase 7: Refinements, Error Handling, and Documentation

1.  **Error Handling (Robustness):**
    *   **Frontend:**
        *   Gracefully handle API errors from both OpenAPI SDK calls and tRPC calls. Display user-friendly messages (`shadcn/ui Alert`, `Toast`).
        *   Handle WebSocket connection errors and disconnections.
        *   If a session becomes invalid, redirect to the sign-in page.
        *   Handle image upload failures (network issues, file too large, wrong type).
    *   **Backend:**
        *   Implement comprehensive error handling in all routes and services.
        *   Use consistent error response formats.
        *   Log errors effectively.
        *   Validate inputs for all API endpoints and tRPC procedures (Zod is good for this).

2.  **Edge Cases:**
    *   Test partial uploads (if possible to simulate).
    *   Implement validation for image file types (e.g., only JPEG, PNG).
    *   Consider rate limiting for certain API endpoints if this were a public app.

3.  **UI/UX Enhancements (shadcn/ui):**
    *   Ensure all interactive elements are styled with `shadcn/ui` components.
    *   Refine the layout and responsiveness of the dashboard and image gallery.
    *   Implement visual feedback for actions (loading spinners, success indicators).
    *   *Level 3*: Consider progress bars for batch image uploads (if implementing batch uploads).
    *   *Level 3*: Add more advanced UI for images (e.g., modals to view larger images, display more EXIF data).

4.  **Code Organization & Quality:**
    *   Review and refactor code for clarity, maintainability, and efficiency.
    *   Ensure distinct modules for auth, image handling, WebSocket logic, tRPC, etc.
    *   Add JSDoc/TSDoc comments for important functions and types.
    *   Run linters and formatters (e.g., ESLint, Prettier).

5.  **README.md - Comprehensive Documentation:**
    *   **Setup Instructions:**
        *   Detailed steps to clone the repository and install dependencies (for both backend and frontend).
        *   How to set up local environment variables (or indicate they are pulled from Secret Manager).
        *   Instructions for setting up the GCP project:
            *   Enabling APIs.
            *   Creating OAuth credentials (Client ID, Secret) and where to put them (Secret Manager).
            *   Creating GCS bucket.
            *   Setting up and deploying the Cloud Function (including trigger configuration).
            *   Creating secrets in Google Secret Manager and granting permissions.
    *   **Running the Application Locally:**
        *   Commands to start the backend server.
        *   Commands to start the frontend development server.
    *   **Architecture Overview:**
        *   Brief explanation of the tech stack.
        *   How OpenAPI is used for SDK generation and main API routes.
        *   How tRPC is integrated for specific, type-safe client-server communication.
        *   How WebSockets are used for real-time updates.
        *   Flow of image upload and processing.
    *   **Link to Loom Video.**

6.  **(Optional - Level 3) Database Integration:**
    *   If opting for a real database instead of in-memory:
        *   Choose Prisma and Postgres.
        *   Set up a local Postgres instance (e.g., via Docker).
        *   Install Prisma Client and Prisma CLI.
        *   Define Prisma schema for Users, Images, etc.
        *   Replace in-memory store logic with Prisma Client calls.
        *   Consider setting up Google Cloud SQL for a deployed version.

7.  **(Optional - Level 3) Containerization:**
    *   Create `Dockerfile` for the backend.
    *   Create `Dockerfile` for the frontend (for serving static built assets, e.g., with Nginx).
    *   Create `docker-compose.yml` for easy local startup of both services (and Postgres if used).

## Phase 8: Loom Video Walkthrough & Submission

1.  **Prepare for Loom Video:**
    *   Ensure the application is fully functional locally as per the demo requirements.
    *   Test the entire flow: Secret pulling -> Google Sign-in -> Image Upload -> GCS verification -> Cloud Function processing -> Real-time UI update.
    *   Outline talking points for the code walkthrough, architecture discussion, challenges, and tradeoffs.

2.  **Record Loom Video:**
    *   **Demonstration:**
        *   Show how secrets are pulled/configured for local development.
        *   Demonstrate the Google OAuth sign-in flow.
        *   Upload an image. Show it appearing in the GCS bucket.
        *   Show the Cloud Function processing the image (e.g., logs or resulting processed file in GCS).
        *   Show the frontend receiving the real-time "processed" event and updating the UI.
    *   **Code & Architecture Walkthrough:**
        *   Explain the project structure (monorepo, backend, frontend, Cloud Function).
        *   Highlight how OpenAPI spec is used and SDK is generated/consumed.
        *   Show tRPC integration (router, client, example usage).
        *   Explain WebSocket implementation for real-time updates.
        *   Discuss secret management approach.
        *   Explain the in-memory data store (or DB if implemented).
    *   **Challenges & Tradeoffs:**
        *   Discuss any difficulties encountered with GCP services.
        *   Explain design decisions (e.g., why OpenAPI + tRPC, session management strategy, real-time update mechanism).
        *   Talk about any scope adjustments or features not fully implemented and why.

3.  **Final Repository Check & Submission:**
    *   Ensure all code is committed with meaningful, atomic messages.
    *   Push all changes to the private Git repository.
    *   Double-check that @robertjchristian is invited as a collaborator.
    *   Ensure the `README.md` is complete and includes the link to the Loom video.
    *   Submit the repository link and any other required information.

This plan aims to cover all specified requirements and provides a pathway to achieve different levels of completion. Flexibility will be needed as development progresses. 