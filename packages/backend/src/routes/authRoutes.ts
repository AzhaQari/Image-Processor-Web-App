import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { google } from 'googleapis';
import { getConfig } from '../config/secrets';
import { userService } from '../services/userService';

// Define a type for our session data
interface AppSessionData {
  userId?: string;
  // You can add other session-related fields here, like expiry, roles, etc.
}

// Augment FastifyRequest to include our session type
declare module 'fastify' {
  interface Session {
    user?: AppSessionData;
  }
}

export default async function authRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  const config = getConfig();
  if (!config.googleClientId || !config.googleClientSecret || !config.gcpProjectId) {
    throw new Error('Google OAuth credentials or GCP Project ID are not loaded. Cannot initialize auth routes.');
  }

  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    `http://localhost:3000/api/auth/google/callback` // Make sure this matches your GCP console and openapi.yaml
  );

  // Route to initiate Google OAuth flow
  // Adjusted to GET as it's a redirect initiator
  fastify.get('/google', async (request, reply) => {
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
  });

  // Route to handle Google OAuth callback
  fastify.get('/google/callback', async (request: FastifyRequest<{ Querystring: { code?: string; error?: string } }>, reply: FastifyReply) => {
    const { code } = request.query;
    if (!code) {
      reply.status(400).send({ error: 'Missing authorization code' });
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user profile info
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: profile } = await oauth2.userinfo.get();

      if (!profile.id || !profile.email) {
        fastify.log.error('Google profile missing id or email', profile);
        reply.status(500).send({ error: 'Failed to retrieve user profile from Google' });
        return;
      }

      const user = userService.findOrCreateUser({
        id: profile.id,
        email: profile.email,
        name: profile.name || undefined,
      });

      // Store user identifier in session
      // Make sure session object is available by registering @fastify/session
      if (!request.session) {
        fastify.log.error('Session object not found on request. Ensure @fastify/session is registered.');
        reply.status(500).send({ error: 'Session management not configured.'});
        return;
      }
      request.session.user = { userId: user.id };
      fastify.log.info({ userId: user.id }, 'User session created');
      
      // For debugging session creation:
      // console.log('Session after set:', request.session);
      // console.log('All users:', userService._getAllUsers());

      // Redirect to frontend dashboard (adjust URL as needed)
      reply.redirect('http://localhost:5173/dashboard'); // Assuming Vite default port for frontend
    } catch (error) {
      fastify.log.error('OAuth callback error:', error);
      reply.status(500).send({ error: 'Authentication failed', details: (error as Error).message });
    }
  });

  // Route to log out the current user
  fastify.post('/logout', async (request, reply) => {
    if (request.session.user) {
      try {
        await request.session.destroy();
        reply.send({ message: 'Successfully logged out' });
      } catch (err) {
        fastify.log.error('Session destruction error:', err);
        reply.status(500).send({ error: 'Failed to logout' });
      }
    } else {
      reply.status(400).send({ message: 'Not logged in' });
    }
  });

  // REMOVED /me route, as it will be handled by tRPC
  /*
  fastify.get('/me', {
    preHandler: fastify.auth([verifyUserSession]) // Ensure user is authenticated
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.session.user!.userId!;
    try {
      const user = userService.findById(userId);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      // Return a subset of user data suitable for the client
      reply.send({ 
        id: user.id, 
        email: user.email, 
        name: user.name 
        // photoUrl: user.photoUrl // if you add it to your user model and want to send it
      });
    } catch (error) {
      fastify.log.error('Error fetching user profile:', error);
      reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve user profile.' });
    }
  });
  */
} 