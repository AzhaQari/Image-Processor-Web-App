# 7Sigma Full-Stack Web Application Assessment

## Overview

Create a full-stack web application where users can:

1.	Sign in via Google OAuth 2.0 (using their own Google Cloud credentials).
2.	Upload and process images stored in Google Cloud Storage (GCS).
3.	View real-time updates on image processing status via WebSockets.
4.	Leverage an OpenAPI-based backend that can generate an SDK for the UI, alongside tRPC integration for type-safe client-side calls.
5.	Securely manage secrets (OAuth credentials, GCS keys, etc.) using Google Secret Manager.
6.	Use an in-memory database (like a plain JavaScript/TypeScript array or a memory-based store) for user or image metadata if needed.

## Deliverables

- A private Git repository (invite @robertjchristian)
- A Loom video walkthrough
- Final presentation over Google Meet

### In the Loom video, you must:

1.	Demonstrate running and using the application locally.
2.	Walk through the code, project structure, and architecture.
3.	Discuss challenges, tradeoffs, and design decisions you faced.

⸻

## Tech Stack:

### Frontend: 
  - Vite + React + shadcn/ui for a modern, performant UI.
### Backend:
  - Fastify, with routes defined via OpenAPI (Swagger) so an SDK can be generated for the UI.
  - Additionally, tRPC can be used for some or all front-end calls (demonstrate how to integrate tRPC in a limited or specialized scope).
  - Google Cloud:
    - OAuth 2.0 for authentication (Client ID, Client Secret from your own GCP project).
    - Cloud Storage for file uploads.
    - Cloud Functions for image processing (trigger on file upload or via an HTTP call).
    - Secrets Manager to store sensitive credentials (like your GCS service account JSON, OAuth secrets, etc.).
  - WebSockets: to push real-time updates to the client (e.g., image processing status).

Optional: You may containerize or provide Docker files if you wish, but it’s not mandatory. Focus on local dev plus GCP integration.

⸻

## Requirements

### Authentication & Security
	
1.	Google OAuth Flow
    - Implement sign-in with Google.
	- Handle OAuth callback, retrieve tokens, and store them securely on the backend (session, JWT, or otherwise).
	- Refresh tokens should be handled if your flow uses short-lived access tokens.
2.	Secret Management
    - All sensitive credentials (OAuth client secret, service account JSON, etc.) must be stored in Google Secret Manager.
    - Your application (running locally or on your environment) should fetch these secrets on startup or on demand.
    - Document how to set up these secrets in your README.
3.	Authorization
    - Protect certain endpoints (e.g., image upload) so only authenticated users can access them.
    - Return 401 Unauthorized or 403 Forbidden if the user is not authenticated.

### Backend: OpenAPI + SDK Generation + tRPC

1.	OpenAPI (Swagger) Spec
    - Define your API routes in an OpenAPI spec.
	- Generate an SDK client (TypeScript) from that spec.
	- The React front-end should use that generated SDK for the majority of requests.
2.	tRPC Integration
	- Demonstrate a small set of “procedures” that the client can call with type-safety.
	- Show how you combine tRPC + your OpenAPI-based routes. (For example, maybe your auth or user profile routes are tRPC-based.)
	- In-Memory Database - It’s acceptable to store user info or image metadata in memory for simplicity. If the server restarts, data may be lost (that’s fine for this exercise).
	- If you prefer a real DB, please use Prisma and Postgres.
3. Image Upload & Processing
    - File Upload Endpoint
      - Expose a route (defined in OpenAPI) to upload images.
      - The route must be protected (only authenticated users can call it).
      - Store files in Google Cloud Storage in your chosen bucket.
      - Cloud Function
        - Trigger on file finalize (or a direct invocation) in GCS.
	    - Process the image (e.g., generate a thumbnail, extract EXIF data, or apply a simple filter).
        - Write the processed image back to GCS.
        - You may store metadata (dimensions, timestamps, user ID) in your in-memory store or embed it in the file’s name.
4.	Real-Time WebSockets
      - Notify the user when the processing is complete.
      - The front-end should show a “processing” status, then update to “processed” in real-time once the function finishes.

### Frontend (Vite + React + shadcn/ui)

1.	UI/UX
    - Landing Page: “Sign in with Google” button.
    - Dashboard Page (post-login):
    - Drag-and-drop area for image upload.
    - A list or gallery of uploaded images (use shadcn/ui components to style them).
    - Each image shows statuses (“Uploaded”, “Processing…”, “Processed”) and any relevant metadata (EXIF, timestamps, etc.).
    - Progress Bar during upload or an indication of real-time status.
2.	OpenAPI SDK + tRPC Calls
	- Show usage of the generated TypeScript SDK for main CRUD (upload, list images, etc.).
    - Use tRPC for some specialized calls (maybe user profile or a real-time subscription).
3.	WebSockets Integration
    - When the server pushes a “processing complete” event, the front-end updates automatically without a manual refresh.
    - Show a small toast or UI indicator upon completion (shadcn/ui toast, etc.).

4.	Error Handling & Edge Cases
    - If a user’s session is invalid, redirect them to sign in.
    - If the upload fails or the Cloud Function has an error, display an appropriate message.

### Loom Video Walkthrough (Required)

1.	Run the Application Locally
    - Show pulling secrets from Google Secret Manager.
    - Demonstrate sign-in via Google OAuth.
    - Upload an image; see it appear in GCS.
    - Cloud Function processes it; front-end receives real-time “processed” event.
2.	Code and Architecture
    - Walk through your file structure, especially how OpenAPI, tRPC, and the front-end interconnect.
    - Show how you handle secrets, environment variables, and your in-memory store.
    - Discuss any design tradeoffs (why OpenAPI + tRPC, how you handle real-time updates, etc.).
3.	Challenges & Tradeoffs
    - Explain any particular difficulties with GCP services.
    - Discuss how you tackled the combination of custom code, generated SDK, and tRPC.

⸻

## Grading & Levels of Completion

We will grade your submission primarily on architecture, code quality, security, real-time functionality, and how well you use Google Cloud. We also evaluate your Loom video to ensure you can articulate your design clearly, and how you go about refining scope and handling ambiguities during the process.

### Level 1: Basic (Minimum Viable)

  - Google OAuth flow works (login/logout).
  - Users can upload images, which are stored in GCS.
  - Cloud Function triggers and processes images (e.g., generates a thumbnail).
  - WebSockets broadcast a “processing complete” message to the front-end.
  - The front-end displays a list of images with minimal UI (no advanced styling).

### Level 2: Intermediate

  - Full OpenAPI spec for the backend routes + a generated TypeScript SDK used in the front-end.
  - tRPC integrated for some part of the system (e.g., user session checks).
  - More polished UI with shadcn/ui components (file drop zones, toasts, etc.).
  - Proper handling of Google Secret Manager for credentials.
  - Real-time status updates using websockets, with a clear loading/progress UI.

### Level 3: Advanced
  - Thorough error handling and edge case coverage (e.g., partial uploads, invalid file types).
  - Progress bars and drag-and-drop UI for batch image uploads.
  - Additional image transformations (resizing, EXIF extraction, or optional filters).
  - A more robust UI (thumbnails, modals, or multiple gallery views).
  - Crisp code organization, including a well-structured repository with distinct modules (auth, upload, processing, real-time, etc.).
  - Potentially some local or containerized deployment strategy (Docker, etc.) with documentation.
  - Google Cloud SQL with Prisma

⸻

## Submission Instructions

1.	Private Git Repository
    - Create a private repo.
	- Invite @robertjchristian as a collaborator.
	- Commit your code with meaningful messages.
2.	README
	- Document how to run your app locally, including environment variable setup.
	- Outline how you set up Google Cloud Secret Manager, OAuth credentials, and Cloud Functions.
	- Summarize the architecture (OpenAPI + tRPC usage).
3.	Loom Video (Mandatory)
	- Demonstrate a working application.
	- Provide a tour of the code, architecture, tradeoffs, and challenges.
	- Link the Loom video in your README or share it privately with the reviewer.

⸻

## Timeframe

  - Aim to spend about one week on this.
  - If you can’t complete everything, focus on a smaller scope but keep the code well structured.

⸻

Good Luck!

This assignment is meant to simulate a real-world environment with multiple moving parts.  It’s not easily solved with simple AI prompts alone — setup, debugging, and design decisions will require genuine problem-solving.  It's okay if not everything is implemented within the time allotted.  This is measured on a curve.  We do consider the state of the art LLMs at the time of this writing, and expect you to take full advantage of available AI tools.  

We look forward to seeing your approach, design, and final product.