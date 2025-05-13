/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { User } from '../models/User';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * Initiate Google OAuth2 login
     * Redirects the user to Google's OAuth2 consent screen.
     * @returns void
     * @throws ApiError
     */
    public static getApiAuthGoogle(): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/google',
            errors: {
                302: `Redirect to Google OAuth2 consent screen.`,
                500: `Server error if OAuth credentials are not configured.`,
            },
        });
    }
    /**
     * Handle Google OAuth2 callback
     * Handles the callback from Google after user authentication. Exchanges code for tokens, fetches profile, creates/finds user, sets session, and redirects to frontend.
     * @param code The authorization code from Google.
     * @param state An optional state parameter for CSRF protection (if used).
     * @returns void
     * @throws ApiError
     */
    public static getApiAuthGoogleCallback(
        code: string,
        state?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/google/callback',
            query: {
                'code': code,
                'state': state,
            },
            errors: {
                302: `Redirect to frontend dashboard on successful authentication.`,
                400: `Bad request, e.g., missing authorization code.`,
                500: `Internal server error during OAuth callback processing.`,
            },
        });
    }
    /**
     * Logout user
     * Destroys the current user's session.
     * @returns any Successfully logged out.
     * @throws ApiError
     */
    public static postApiAuthLogout(): CancelablePromise<{
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/logout',
            errors: {
                400: `Bad request, e.g., user not logged in.`,
                500: `Internal server error during logout.`,
            },
        });
    }
    /**
     * Get current user profile
     * Retrieves the profile of the currently authenticated user.
     * @returns User Successfully retrieved user profile.
     * @throws ApiError
     */
    public static getApiAuthMe(): CancelablePromise<User> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/me',
            errors: {
                401: `Unauthorized, user not authenticated.`,
            },
        });
    }
}
