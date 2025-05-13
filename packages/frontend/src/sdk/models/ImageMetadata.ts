/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ImageMetadata = {
    /**
     * Unique identifier for the image metadata record.
     */
    id: string;
    /**
     * Identifier of the user who uploaded the image.
     */
    userId: string;
    /**
     * Original name of the uploaded file.
     */
    fileName: string;
    /**
     * Path to the image file in Google Cloud Storage.
     */
    gcsPath: string;
    /**
     * MIME type of the image.
     */
    contentType: string;
    /**
     * Size of the image in bytes.
     */
    size?: number;
    /**
     * Timestamp of when the image was uploaded.
     */
    uploadTimestamp: string;
    /**
     * Current status of the image.
     */
    status: ImageMetadata.status;
};
export namespace ImageMetadata {
    /**
     * Current status of the image.
     */
    export enum status {
        UPLOADED = 'uploaded',
        PROCESSING = 'processing',
        PROCESSED = 'processed',
        FAILED = 'failed',
    }
}

