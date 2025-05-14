/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ImageMetadata } from '../models/ImageMetadata';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ImagesService {
    /**
     * Upload an image
     * Allows authenticated users to upload an image file. The file will be stored in GCS and metadata saved.
     * @param formData
     * @returns ImageMetadata Image uploaded successfully.
     * @throws ApiError
     */
    public static postApiImagesUpload(
        formData: {
            /**
             * The image file to upload.
             */
            file: Blob;
        },
    ): CancelablePromise<ImageMetadata> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/images/upload',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                400: `Bad request (e.g., no file, invalid file type).`,
                401: `Unauthorized.`,
                500: `Internal server error (e.g., GCS upload failure, config error).`,
            },
        });
    }
    /**
     * List user's images
     * Retrieves a list of image metadata records uploaded by the authenticated user, sorted by most recent.
     * @returns ImageMetadata Successfully retrieved list of image metadata.
     * @throws ApiError
     */
    public static getApiImages(): CancelablePromise<Array<ImageMetadata>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/images',
            errors: {
                401: `Unauthorized.`,
                500: `Internal server error.`,
            },
        });
    }
}
