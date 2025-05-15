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
exports.default = authRoutes;
const googleapis_1 = require("googleapis");
const secrets_1 = require("../config/secrets");
const userService_1 = require("../services/userService");
function authRoutes(fastify, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = (0, secrets_1.getConfig)();
        if (!config.googleClientId || !config.googleClientSecret || !config.gcpProjectId) {
            throw new Error('Google OAuth credentials or GCP Project ID are not loaded. Cannot initialize auth routes.');
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(config.googleClientId, config.googleClientSecret, `http://localhost:3000/api/auth/google/callback` // Make sure this matches your GCP console and openapi.yaml
        );
        // Route to initiate Google OAuth flow
        // Adjusted to GET as it's a redirect initiator
        fastify.get('/google', (request, reply) => __awaiter(this, void 0, void 0, function* () {
            const scopes = [
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
                'openid'
            ];
            const url = oauth2Client.generateAuthUrl({
                access_type: 'offline', // offline gets a refresh token
                scope: scopes,
                // prompt: 'consent' // Optional: forces consent screen every time, useful for dev
            });
            reply.redirect(url);
        }));
        // Route to handle Google OAuth callback
        fastify.get('/google/callback', (request, reply) => __awaiter(this, void 0, void 0, function* () {
            const { code } = request.query;
            if (!code) {
                reply.status(400).send({ error: 'Missing authorization code' });
                return;
            }
            try {
                const { tokens } = yield oauth2Client.getToken(code);
                oauth2Client.setCredentials(tokens);
                // Get user profile info
                const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
                const { data: profile } = yield oauth2.userinfo.get();
                if (!profile.id || !profile.email) {
                    fastify.log.error('Google profile missing id or email', profile);
                    reply.status(500).send({ error: 'Failed to retrieve user profile from Google' });
                    return;
                }
                const user = userService_1.userService.findOrCreateUser({
                    id: profile.id,
                    email: profile.email,
                    name: profile.name || undefined,
                });
                // Store user identifier in session
                // Make sure session object is available by registering @fastify/session
                if (!request.session) {
                    fastify.log.error('Session object not found on request. Ensure @fastify/session is registered.');
                    reply.status(500).send({ error: 'Session management not configured.' });
                    return;
                }
                request.session.user = { userId: user.id };
                fastify.log.info({ userId: user.id }, 'User session created');
                // For debugging session creation:
                // console.log('Session after set:', request.session);
                // console.log('All users:', userService._getAllUsers());
                // Redirect to frontend dashboard (adjust URL as needed)
                reply.redirect('http://localhost:5173/dashboard'); // Assuming Vite default port for frontend
            }
            catch (error) {
                fastify.log.error('OAuth callback error:', error);
                reply.status(500).send({ error: 'Authentication failed', details: error.message });
            }
        }));
        // Route to log out the current user
        fastify.post('/logout', (request, reply) => __awaiter(this, void 0, void 0, function* () {
            if (request.session.user) {
                try {
                    yield request.session.destroy();
                    reply.send({ message: 'Successfully logged out' });
                }
                catch (err) {
                    fastify.log.error('Session destruction error:', err);
                    reply.status(500).send({ error: 'Failed to logout' });
                }
            }
            else {
                reply.status(400).send({ message: 'Not logged in' });
            }
        }));
        // Route to get current user's profile (protected)
        fastify.get('/me', (request, reply) => __awaiter(this, void 0, void 0, function* () {
            if (!request.session.user || !request.session.user.userId) {
                reply.status(401).send({ error: 'Unauthorized' });
                return;
            }
            const user = userService_1.userService.findById(request.session.user.userId);
            if (!user) {
                // This case should ideally not happen if session.user.userId is valid
                // and user was not deleted from store while session is active.
                // Could destroy session here as a precaution.
                yield request.session.destroy();
                reply.status(401).send({ error: 'Unauthorized - user not found, session terminated' });
                return;
            }
            // Don't send sensitive stuff like tokens here unless specifically needed by frontend
            // and frontend handles them securely.
            reply.send({ id: user.id, email: user.email, name: user.name });
        }));
    });
}
