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
exports.default = imageRoutes;
const crypto_1 = require("crypto");
const secrets_1 = require("../config/secrets");
const imageService_1 = require("../services/imageService");
const gcsService_1 = require("../services/gcsService");
function imageRoutes(fastify) {
    return __awaiter(this, void 0, void 0, function* () {
        // Create a verification function for @fastify/auth
        // This function will be passed to fastify.auth()
        const verifyUserSession = (request, reply) => __awaiter(this, void 0, void 0, function* () {
            if (!request.session || !request.session.user || !request.session.user.userId) {
                throw fastify.httpErrors.unauthorized('User not authenticated');
            }
            // If you needed to load the full user object from DB here, you could:
            // const user = await userService.findById(request.session.user.userId);
            // if (!user) throw fastify.httpErrors.unauthorized('User not found');
            // request.user = user; // Decorate request with full user object if needed by handlers
        });
        fastify.post('/upload', {
            preHandler: fastify.auth([verifyUserSession]), // Apply auth for this route
            handler: (request, reply) => __awaiter(this, void 0, void 0, function* () {
                const appConfig = (0, secrets_1.getConfig)();
                const gcsBucketName = appConfig.gcsBucketName;
                if (!gcsBucketName) {
                    fastify.log.error('GCS_BUCKET_NAME is not configured (from appConfig.gcsBucketName).');
                    return reply.code(500).send({ error: 'Configuration error', message: 'GCS bucket name not set.' });
                }
                const data = yield request.file();
                if (!data) {
                    return reply.code(400).send({ error: 'Bad Request', message: 'No file uploaded.' });
                }
                const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
                if (!allowedMimeTypes.includes(data.mimetype)) {
                    return reply.code(400).send({ error: 'Bad Request', message: 'Invalid file type. Only JPEG, PNG, GIF allowed.' });
                }
                const userId = request.session.user.userId;
                const uniqueId = (0, crypto_1.randomUUID)();
                const gcsFileName = `${userId}/${uniqueId}_${data.filename}`;
                const file = (0, gcsService_1.getStorage)().bucket(gcsBucketName).file(gcsFileName);
                try {
                    fastify.log.info(`Uploading ${data.filename} to gs://${gcsBucketName}/${gcsFileName}`);
                    yield new Promise((resolve, reject) => {
                        const writeStream = file.createWriteStream({
                            metadata: { contentType: data.mimetype },
                            resumable: false,
                        });
                        data.file.pipe(writeStream).on('finish', resolve).on('error', reject);
                    });
                    fastify.log.info(`Successfully uploaded ${data.filename} to GCS.`);
                    const metadataToSave = {
                        userId,
                        fileName: data.filename,
                        gcsPath: `gs://${gcsBucketName}/${gcsFileName}`.trim(),
                        contentType: data.mimetype,
                        size: data.file.bytesRead,
                        status: 'uploaded',
                    };
                    const savedImage = yield (0, imageService_1.saveImageMetadata)(metadataToSave);
                    reply.code(201).send(savedImage);
                }
                catch (error) {
                    fastify.log.error('Error uploading file to GCS or saving metadata:', error);
                    reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to upload image.' });
                }
            })
        });
        fastify.get('/', {
            preHandler: fastify.auth([verifyUserSession]), // Apply auth for this route
            handler: (request, reply) => __awaiter(this, void 0, void 0, function* () {
                const userId = request.session.user.userId;
                try {
                    const images = yield (0, imageService_1.getImagesByUserId)(userId);
                    reply.send(images);
                }
                catch (error) {
                    fastify.log.error('Error fetching images for user:', error);
                    reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to fetch images.' });
                }
            })
        });
        // Debugging endpoint to list all files in the bucket
        fastify.get('/debug/list-files', {
            preHandler: fastify.auth([verifyUserSession]), // Only authenticated users can access
            handler: (request, reply) => __awaiter(this, void 0, void 0, function* () {
                try {
                    // Get userId from session to list files for that user
                    const userId = request.session.user.userId;
                    // List files for this user
                    const files = yield (0, gcsService_1.listFiles)(userId + '/');
                    reply.send({
                        userId,
                        files,
                        count: files.length
                    });
                }
                catch (error) {
                    fastify.log.error('Error listing files from GCS:', error);
                    reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to list files from GCS.' });
                }
            })
        });
        // TODO: Consider adding a GET /api/images/:imageId for specific image details if needed
    });
}
