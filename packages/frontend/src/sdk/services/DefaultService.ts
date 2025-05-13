/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Initiate Google OAuth flow
     * @returns void
     * @throws ApiError
     */
    public static postAuthGoogle(): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/google',
            errors: {
                302: `Redirect to Google's OAuth consent screen.`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Handle Google OAuth callback
     * @param code Authorization code from Google.
     * @param state An opaque value used to maintain state between the request and callback.
     * @returns void
     * @throws ApiError
     */
    public static getAuthGoogleCallback(
        code: string,
        state?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/google/callback',
            query: {
                'code': code,
                'state': state,
            },
            errors: {
                302: `Redirect to frontend dashboard on success.`,
                400: `Bad Request (e.g., missing code)`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Log out the current user
     * @returns any Successfully logged out.
     * @throws ApiError
     */
    public static postAuthLogout(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/logout',
            errors: {
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get current user's profile
     * @returns any User profile data.
     * @throws ApiError
     */
    public static getUsersMe(): CancelablePromise<{
        id?: string;
        email?: string;
        name?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/users/me',
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Upload an image
     * @param formData
     * @returns any Image uploaded successfully.
     * @throws ApiError
     */
    public static postImagesUpload(
        formData: {
            image?: Blob;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/images/upload',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                400: `Bad Request (e.g., no file, invalid file type)`,
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * List user's images
     * @returns any A list of images.
     * @throws ApiError
     */
    public static getImages(): CancelablePromise<Array<Record<string, any>>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/images',
            errors: {
                401: `Unauthorized`,
            },
        });
    }
}
