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
exports.default = notificationRoutes;
const imageService_1 = require("../services/imageService");
const webSocketService_1 = require("../services/webSocketService");
function notificationRoutes(fastify) {
    return __awaiter(this, void 0, void 0, function* () {
        // Simple API key check middleware
        // In a production app, this would use a more robust auth mechanism
        const verifyCloudFunctionApiKey = (request, reply) => __awaiter(this, void 0, void 0, function* () {
            const { apiKey } = request.body;
            // This should be loaded from environment/secrets in a real app
            const expectedApiKey = process.env.CLOUD_FUNCTION_API_KEY || 'dev-cloud-function-key';
            if (!apiKey || apiKey !== expectedApiKey) {
                throw fastify.httpErrors.unauthorized('Invalid API key');
            }
        });
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
            handler: (request, reply) => __awaiter(this, void 0, void 0, function* () {
                const { imageId, userId, status, thumbnailPath, errorMessage } = request.body;
                fastify.log.info(`Received image processing notification: imageId=${imageId}, userId=${userId}, status=${status}`);
                try {
                    // Update image status in database
                    fastify.log.info(`Attempting to update image status for imageId=${imageId}, userId=${userId}, status=${status}`);
                    const updatedImage = yield (0, imageService_1.updateImageStatus)(imageId, userId, status);
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
                        (0, webSocketService_1.sendWebSocketMessageToUser)(userId, message);
                        fastify.log.info(`Successfully sent WebSocket message to userId=${userId}`);
                    }
                    catch (wsError) {
                        fastify.log.error(`Error sending WebSocket message to userId=${userId}:`, wsError);
                    }
                    return reply.code(200).send({
                        message: 'Notification processed successfully',
                        imageId,
                        status
                    });
                }
                catch (error) {
                    fastify.log.error(`Error processing notification:`, error);
                    return reply.code(500).send({
                        message: 'Failed to process notification',
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            })
        });
    });
}
