import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { updateImageStatus } from '../services/imageService';
import { sendWebSocketMessageToUser } from '../services/webSocketService';

// Interface for processing notification payload
interface ProcessingNotificationPayload {
  imageId: string;
  userId: string;
  status: 'processed' | 'failed';
  thumbnailPath?: string;
  errorMessage?: string;
  apiKey: string; // For simple authorization
}

export default async function notificationRoutes(fastify: FastifyInstance) {
  // Simple API key check middleware
  // In a production app, this would use a more robust auth mechanism
  const verifyCloudFunctionApiKey = async (request: FastifyRequest, reply: FastifyReply) => {
    const { apiKey } = request.body as { apiKey?: string };
    // This should be loaded from environment/secrets in a real app
    const expectedApiKey = process.env.CLOUD_FUNCTION_API_KEY || 'dev-cloud-function-key';
    
    if (!apiKey || apiKey !== expectedApiKey) {
      throw fastify.httpErrors.unauthorized('Invalid API key');
    }
  };

  // Endpoint to receive notifications from Cloud Function
  fastify.post('/image-processed', {
    schema: {
      body: {
        type: 'object',
        required: ['imageId', 'userId', 'status', 'apiKey'],
        properties: {
          imageId: { type: 'string' },
          userId: { type: 'string' },
          status: { type: 'string', enum: ['processing', 'processed', 'failed'] },
          thumbnailPath: { type: 'string' },
          errorMessage: { type: 'string' },
          apiKey: { type: 'string' }
        }
      }
    },
    preHandler: verifyCloudFunctionApiKey,
    handler: async (request, reply) => {
      const { imageId, userId, status, thumbnailPath, errorMessage } = request.body as ProcessingNotificationPayload;
      
      fastify.log.info(`Received image processing notification: imageId=${imageId}, userId=${userId}, status=${status}`);

      try {
        // Update image status in database
        fastify.log.info(`Attempting to update image status for imageId=${imageId}, userId=${userId}, status=${status}`);
        const updatedImage = await updateImageStatus(imageId, userId, status);
        
        if (!updatedImage) {
          fastify.log.warn(`Image not found: ${imageId} for user ${userId}`);
          return reply.code(404).send({
            message: 'Image not found'
          });
        }

        // Send WebSocket message to the user
        const message = {
          type: 'IMAGE_STATUS_UPDATE',
          payload: {
            id: imageId,
            status,
            fileName: updatedImage.fileName,
            thumbnailPath: thumbnailPath || null,
            errorMessage: errorMessage || null
          }
        };
        
        fastify.log.info(`Preparing to send WebSocket message to userId=${userId}:`, message);
        
        try {
          sendWebSocketMessageToUser(userId, message);
          fastify.log.info(`Successfully sent WebSocket message to userId=${userId}`);
        } catch (wsError) {
          fastify.log.error(`Error sending WebSocket message to userId=${userId}:`, wsError);
        }
        
        return reply.code(200).send({
          message: 'Notification processed successfully',
          imageId,
          status
        });
      } catch (error) {
        fastify.log.error(`Error processing notification:`, error);
        return reply.code(500).send({
          message: 'Failed to process notification',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });
} 