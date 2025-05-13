import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { getConfig } from '../config/secrets';
import { saveImageMetadata, ImageMetadata } from '../services/imageService';
// No longer need to import AppSessionData from authRoutes if we define it locally or rely on augmentation

// Initialize GCS Storage client
const storage = new Storage();

// Define a type for our session user data (consistent with authRoutes)
interface SessionUserData {
  userId?: string;
}

// Augment Fastify to include our session user type
// This ensures that request.session.user is typed correctly across the application
// where @fastify/session is used.
declare module 'fastify' {
  interface Session {
    user?: SessionUserData;
  }
}

// No need for a separate AuthenticatedRequest if module augmentation is correctly applied
// We will use FastifyRequest directly and trust the augmentation for request.session.user

export default async function imageRoutes(fastify: FastifyInstance) {
  // Authentication hook (simple version, adapt as needed from authRoutes or a shared hook)
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // request.session.user should be automatically typed by the declare module above
    if (!request.session || !request.session.user || !request.session.user.userId) {
      reply.code(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
      return; // Important to stop further processing
    }
  });

  fastify.post('/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    // request.session.user is now correctly typed here as well
    const appConfig = getConfig();
    const gcsBucketName = appConfig.gcsBucketName; // Corrected to camelCase

    if (!gcsBucketName) {
      fastify.log.error('GCS_BUCKET_NAME is not configured (from appConfig.gcsBucketName).');
      return reply.code(500).send({ error: 'Configuration error', message: 'GCS bucket name not set.' });
    }

    const data = await request.file(); // From @fastify/multipart

    if (!data) {
      return reply.code(400).send({ error: 'Bad Request', message: 'No file uploaded.' });
    }

    // Basic validation (can be expanded)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(data.mimetype)) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Invalid file type. Only JPEG, PNG, GIF allowed.' });
    }

    // userId must exist and is string due to the preHandler hook and SessionUserData type
    const userId = request.session.user!.userId!;
    const uniqueId = randomUUID();
    const gcsFileName = `${userId}/${uniqueId}_${data.filename}`;
    const file = storage.bucket(gcsBucketName).file(gcsFileName);

    try {
      fastify.log.info(`Uploading ${data.filename} to gs://${gcsBucketName}/${gcsFileName}`);
      
      // Stream the file to GCS
      await new Promise((resolve, reject) => {
        const writeStream = file.createWriteStream({
          metadata: {
            contentType: data.mimetype,
            // You can add more GCS metadata here if needed
          },
          resumable: false, // Use resumable for large files if needed
        });
        data.file.pipe(writeStream)
          .on('finish', resolve)
          .on('error', reject);
      });

      fastify.log.info(`Successfully uploaded ${data.filename} to GCS.`);

      // Get file size (this might require another GCS call after upload or estimate from stream)
      // For simplicity, we'll use the reported size from multipart if available, or skip for now.
      // const [gcsFileMetadata] = await file.getMetadata();
      // const size = gcsFileMetadata.size;

      const metadataToSave: Omit<ImageMetadata, 'id' | 'uploadTimestamp'> = {
        userId,
        fileName: data.filename,
        gcsPath: `gs://${gcsBucketName}/${gcsFileName}`,
        contentType: data.mimetype,
        size: data.file.bytesRead, // This is bytes processed by multipart, might not be exact final GCS size
        status: 'uploaded',
      };

      const savedImage = await saveImageMetadata(metadataToSave);

      reply.code(201).send(savedImage);
    } catch (error) {
      fastify.log.error('Error uploading file to GCS or saving metadata:', error);
      // Attempt to delete the file from GCS if upload started but failed before metadata save
      // try { await file.delete({ ignoreNotFound: true }); } catch (delError) { fastify.log.error('Failed to cleanup GCS file after error:', delError); }
      reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to upload image.' });
    }
  });

  // TODO: Implement GET /api/images to list images for the user
} 