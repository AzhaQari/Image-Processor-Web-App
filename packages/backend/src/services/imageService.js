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
exports.getImagesByUserId = exports.getImageMetadataById = exports.updateImageStatus = exports.saveImageMetadata = void 0;
const crypto_1 = require("crypto");
const gcsService_1 = require("./gcsService");
const secrets_1 = require("../config/secrets");
// Constants
const THUMBNAIL_PREFIX = 'thumbnails/';
const PROCESSED_PREFIX = 'processed/';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
// In-memory store for image metadata
const images = [];
const saveImageMetadata = (metadata) => __awaiter(void 0, void 0, void 0, function* () {
    const newImage = Object.assign(Object.assign({}, metadata), { id: (0, crypto_1.randomUUID)(), uploadTimestamp: new Date() });
    images.push(newImage);
    console.log('Image metadata saved:', newImage);
    return newImage;
});
exports.saveImageMetadata = saveImageMetadata;
const updateImageStatus = (imageId, userId, status, thumbnailUrl, processedUrl, metadata, errorMessage) => __awaiter(void 0, void 0, void 0, function* () {
    const imageIndex = images.findIndex(img => img.id === imageId && img.userId === userId);
    if (imageIndex === -1) {
        console.warn(`Image not found for update: ${imageId} (user: ${userId})`);
        return null;
    }
    // Generate signed URLs if paths are provided
    let signedThumbnailUrl;
    let signedProcessedUrl;
    if (thumbnailUrl) {
        try {
            signedThumbnailUrl = yield (0, gcsService_1.generateSignedUrl)(thumbnailUrl);
        }
        catch (error) {
            console.error('Error generating signed URL for thumbnail:', error);
        }
    }
    if (processedUrl) {
        try {
            signedProcessedUrl = yield (0, gcsService_1.generateSignedUrl)(processedUrl);
        }
        catch (error) {
            console.error('Error generating signed URL for processed image:', error);
        }
    }
    const updatedImage = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, images[imageIndex]), { status }), (signedThumbnailUrl && { thumbnailUrl: signedThumbnailUrl })), (signedProcessedUrl && { processedUrl: signedProcessedUrl })), (metadata && { metadata })), (errorMessage && { errorMessage }));
    images[imageIndex] = updatedImage;
    console.log(`Updated image ${imageId} status to ${status}`);
    return updatedImage;
});
exports.updateImageStatus = updateImageStatus;
function retryGenerateSignedUrl(gcsPath_1) {
    return __awaiter(this, arguments, void 0, function* (gcsPath, attempt = 1) {
        try {
            return yield (0, gcsService_1.generateSignedUrl)(gcsPath);
        }
        catch (error) {
            if (attempt >= MAX_RETRIES) {
                console.error(`Failed to generate signed URL after ${MAX_RETRIES} attempts:`, error);
                throw error;
            }
            console.warn(`Attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms...`);
            yield new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return retryGenerateSignedUrl(gcsPath, attempt + 1);
        }
    });
}
const getImageMetadataById = (id, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const image = images.find(img => img.id === id && img.userId === userId);
    if (image) {
        try {
            // Generate signed URLs for all image versions with retry logic
            const [signedUrl, thumbnailSignedUrl, processedSignedUrl] = yield Promise.all([
                retryGenerateSignedUrl(image.gcsPath),
                image.thumbnailUrl ? retryGenerateSignedUrl(image.thumbnailUrl) : Promise.resolve(undefined),
                image.processedUrl ? retryGenerateSignedUrl(image.processedUrl) : Promise.resolve(undefined)
            ]);
            image.signedUrl = signedUrl;
            if (thumbnailSignedUrl)
                image.thumbnailUrl = thumbnailSignedUrl;
            if (processedSignedUrl)
                image.processedUrl = processedSignedUrl;
        }
        catch (error) {
            console.error(`Failed to generate signed URLs for image ${id} after retries:`, error);
            // Don't throw the error, return the image without signed URLs
            // This allows the client to still see the image metadata
            image.errorMessage = 'Failed to generate signed URLs. Please try again later.';
        }
    }
    return image;
});
exports.getImageMetadataById = getImageMetadataById;
const getImagesByUserId = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const config = (0, secrets_1.getConfig)();
        const bucketName = config.gcsBucketName;
        if (!bucketName) {
            throw new Error('GCS bucket name not configured');
        }
        const bucket = (0, gcsService_1.getStorage)().bucket(bucketName);
        // Get all files for this user
        const [files] = yield bucket.getFiles({
            prefix: `${userId}/`,
            delimiter: '/'
        });
        // Group files by their base name (without prefixes)
        const fileGroups = new Map();
        files.forEach(file => {
            const filePath = file.name;
            const isThumb = filePath.includes('/thumbnails/');
            const fileName = filePath.split('/').pop();
            const baseName = isThumb ? fileName : fileName;
            if (!fileGroups.has(baseName)) {
                fileGroups.set(baseName, {});
            }
            const group = fileGroups.get(baseName);
            if (isThumb) {
                group.thumbnail = file;
            }
            else {
                group.original = file;
            }
        });
        // Convert file groups to ImageMetadata objects with retry logic for signed URLs
        const imagePromises = Array.from(fileGroups.entries()).map((_a) => __awaiter(void 0, [_a], void 0, function* ([baseName, group]) {
            var _b;
            if (!group.original)
                return null;
            const [metadata] = yield group.original.getMetadata();
            let thumbnailMetadata;
            let thumbnailSignedUrl;
            if (group.thumbnail) {
                [thumbnailMetadata] = yield group.thumbnail.getMetadata();
                try {
                    thumbnailSignedUrl = yield retryGenerateSignedUrl(`gs://${bucketName}/${group.thumbnail.name}`);
                }
                catch (error) {
                    console.error(`Failed to generate thumbnail signed URL for ${baseName}:`, error);
                }
            }
            // Generate signed URL for original with retry
            let originalSignedUrl;
            try {
                originalSignedUrl = yield retryGenerateSignedUrl(`gs://${bucketName}/${group.original.name}`);
            }
            catch (error) {
                console.error(`Failed to generate original signed URL for ${baseName}:`, error);
            }
            // Parse image metadata if available
            let parsedMetadata = {};
            if ((_b = thumbnailMetadata === null || thumbnailMetadata === void 0 ? void 0 : thumbnailMetadata.metadata) === null || _b === void 0 ? void 0 : _b.imageMetadata) {
                try {
                    parsedMetadata = JSON.parse(thumbnailMetadata.metadata.imageMetadata);
                }
                catch (error) {
                    console.error('Error parsing image metadata:', error);
                }
            }
            return {
                id: baseName,
                userId,
                fileName: baseName,
                gcsPath: `gs://${bucketName}/${group.original.name}`,
                contentType: metadata.contentType || 'application/octet-stream',
                size: parseInt(metadata.size, 10) || 0,
                uploadTimestamp: new Date(metadata.timeCreated),
                status: group.thumbnail ? 'processed' : 'uploaded',
                signedUrl: originalSignedUrl,
                thumbnailUrl: thumbnailSignedUrl,
                metadata: parsedMetadata,
                errorMessage: (!originalSignedUrl || (group.thumbnail && !thumbnailSignedUrl))
                    ? 'Some signed URLs could not be generated. Please try again later.'
                    : undefined
            };
        }));
        const images = (yield Promise.all(imagePromises)).filter(Boolean);
        return images;
    }
    catch (error) {
        console.error('Error fetching images from GCS:', error);
        throw new Error('Failed to fetch images. Please try again later.');
    }
});
exports.getImagesByUserId = getImagesByUserId;
