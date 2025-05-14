import { FastifyInstance, FastifyRequest, FastifyReply, RouteHandlerMethod } from 'fastify';
import { randomUUID } from 'crypto';
import { getConfig } from '../config/secrets';
import { saveImageMetadata, ImageMetadata, getImagesByUserId } from '../services/imageService';
import { getStorage, listFiles } from '../services/gcsService';
// No longer need to import AppSessionData from authRoutes if we define it locally or rely on augmentation

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
  // If @fastify/auth is used, it might also augment FastifyInstance with .auth
  interface FastifyInstance {
    auth: any; // Add a basic type for fastify.auth if not automatically picked up
  }
}

export default async function imageRoutes(fastify: FastifyInstance) {
  // Create a verification function for @fastify/auth
  // This function will be passed to fastify.auth()
  const verifyUserSession = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.session || !request.session.user || !request.session.user.userId) {
      throw fastify.httpErrors.unauthorized('User not authenticated');
    }
    // If you needed to load the full user object from DB here, you could:
    // const user = await userService.findById(request.session.user.userId);
    // if (!user) throw fastify.httpErrors.unauthorized('User not found');
    // request.user = user; // Decorate request with full user object if needed by handlers
  };

  fastify.post('/upload', {
    preHandler: fastify.auth([verifyUserSession]), // Apply auth for this route
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const appConfig = getConfig();
      const gcsBucketName = appConfig.gcsBucketName;

      if (!gcsBucketName) {
        fastify.log.error('GCS_BUCKET_NAME is not configured (from appConfig.gcsBucketName).');
        return reply.code(500).send({ error: 'Configuration error', message: 'GCS bucket name not set.' });
      }

      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: 'Bad Request', message: 'No file uploaded.' });
      }

      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid file type. Only JPEG, PNG, GIF allowed.' });
      }

      const userId = request.session.user!.userId!;
      const uniqueId = randomUUID();
      const gcsFileName = `${userId}/${uniqueId}_${data.filename}`;
      const file = getStorage().bucket(gcsBucketName).file(gcsFileName);

      try {
        fastify.log.info(`Uploading ${data.filename} to gs://${gcsBucketName}/${gcsFileName}`);
        
        await new Promise((resolve, reject) => {
          const writeStream = file.createWriteStream({
            metadata: { contentType: data.mimetype },
            resumable: false,
          });
          data.file.pipe(writeStream).on('finish', resolve).on('error', reject);
        });

        fastify.log.info(`Successfully uploaded ${data.filename} to GCS.`);

        const metadataToSave: Omit<ImageMetadata, 'id' | 'uploadTimestamp'> = {
          userId,
          fileName: data.filename,
          gcsPath: `gs://${gcsBucketName}/${gcsFileName}`,
          contentType: data.mimetype,
          size: data.file.bytesRead,
          status: 'uploaded',
        };

        const savedImage = await saveImageMetadata(metadataToSave);
        reply.code(201).send(savedImage);
      } catch (error) {
        fastify.log.error('Error uploading file to GCS or saving metadata:', error);
        reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to upload image.' });
      }
    }
  });

  fastify.get('/', {
    preHandler: fastify.auth([verifyUserSession]), // Apply auth for this route
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.session.user!.userId!;
      try {
        const images = await getImagesByUserId(userId);
        reply.send(images);
      } catch (error) {
        fastify.log.error('Error fetching images for user:', error);
        reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to fetch images.' });
      }
    }
  });

  // Debugging endpoint to list all files in the bucket
  fastify.get('/debug/list-files', {
    preHandler: fastify.auth([verifyUserSession]), // Only authenticated users can access
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get userId from session to list files for that user
        const userId = request.session.user!.userId!;
        
        // List files for this user
        const files = await listFiles(userId + '/');
        
        reply.send({
          userId,
          files,
          count: files.length
        });
      } catch (error) {
        fastify.log.error('Error listing files from GCS:', error);
        reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to list files from GCS.' });
      }
    }
  });

  // TODO: Consider adding a GET /api/images/:imageId for specific image details if needed
} 