import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import path from 'path';
import { loadSecrets, getConfig } from './config/secrets';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import authRoutes from './routes/authRoutes'; // Import the auth routes
import fastifyMultipart from '@fastify/multipart';
import imageRoutes from './routes/imageRoutes';
import notificationRoutes from './routes/notificationRoutes'; // Added import
import fastifyCors from '@fastify/cors';
import fastifyAuth from '@fastify/auth';
import fastifySensible from '@fastify/sensible';
import { setupWebSocketServer } from './services/webSocketService';

// Import tRPC components
import { appRouter, type AppRouter } from './trpc'; // Import AppRouter and its type
import { createContext } from './trpc';
import { fastifyTRPCPlugin, FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify'; // Import options type for better type safety

// __dirname is available in CommonJS modules by default

async function buildServer(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const fastify = Fastify(opts);

  // Register sensible first to make httpErrors available
  fastify.register(fastifySensible);

  // Function to configure and register plugins, routes, etc.
  async function setupApp() {
    // Load secrets before starting the server or registering plugins that need them
    await loadSecrets();
    console.log('Successfully loaded application secrets.');
    const config = getConfig();

    if (config.gcpProjectId) {
      console.log(`Operating with GCP Project ID: ${config.gcpProjectId}`);
    }

    // Register CORS
    // IMPORTANT: Register CORS before routes and potentially before session/cookie if they rely on CORS headers for cross-domain scenarios
    fastify.register(fastifyCors, {
      origin: 'http://localhost:5173', // Frontend URL
      credentials: true, // Allow cookies to be sent and received
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
      allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
    });

    // Register cookie plugin
    fastify.register(cookie);

    // Register session plugin
    if (!config.sessionSecret) {
      throw new Error('SESSION_SECRET is not loaded. Cannot initialize session management.');
    }
    fastify.register(session, {
      secret: config.sessionSecret,
      cookie: {
        secure: process.env.NODE_ENV === 'production', // Send cookie only over HTTPS in production
        httpOnly: true, // Prevents client-side JS from accessing the cookie
        maxAge: 24 * 60 * 60 * 1000 // Session TTL: 1 day
      },
      // saveUninitialized: false, // Don't save sessions that are new but not modified
      // resave: false, // Don't resave session if not modified
    });

    // Register @fastify/auth after session and cookie
    fastify.register(fastifyAuth);

    // Register fastify-multipart for file uploads
    // It's important to register this before routes that use it.
    fastify.register(fastifyMultipart, {
      // addToBody: true, // if you want to access files via request.body.file
      // attachFieldsToBody: true, // if you want to access fields via request.body.fieldName
      // limits: { fileSize: 10 * 1024 * 1024 } // Example: 10MB limit
    });

    // Register tRPC plugin
    // Note: fastifyTRPCPlugin might not need `await` directly on register in all Fastify versions/setups,
    // but it's safer to include if it returns a Promise. If it causes issues, it can be removed.
    await fastify.register(fastifyTRPCPlugin, {
      prefix: '/api/trpc', // All tRPC routes will be under /api/trpc
      trpcOptions: {
        router: appRouter,
        createContext,
        onError: ({ path, error, type, ctx }) => {
          console.error(`Error in tRPC handler on path '${path}' (type: ${type}):`, error);
          // Optionally, you could inspect ctx here if needed
          // Example: if (error.cause instanceof ZodError) { /* handle Zod validation errors */ }
        },
      } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'], // Ensures type safety for options
    });

    // Register auth routes
    fastify.register(authRoutes, { prefix: '/api/auth' });
    fastify.register(imageRoutes, { prefix: '/api/images' });
    fastify.register(notificationRoutes, { prefix: '/api/internal' }); // Added route

    // Register Swagger
    fastify.register(swagger, {
      mode: 'static',
      specification: {
        path: path.join(__dirname, 'openapi.yaml'),
        baseDir: __dirname,
      }
    });

    // Register Swagger UI
    fastify.register(swaggerUi, {
      routePrefix: '/documentation',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      },
    });

    fastify.get('/', async (request, reply) => {
      const currentConfig = getConfig(); // Re-fetch in case it was updated, though unlikely for this scope
      return { message: 'Hello World', projectId: currentConfig.gcpProjectId || 'Not Loaded' };
    });

    // Placeholder for auth routes - to be implemented next
    // fastify.register(authRoutes, { prefix: '/api/auth' });
  }

  await setupApp(); // Call the setup function

  // Initialize WebSocket Server after app setup but before listen
  setupWebSocketServer(fastify.server, fastify);

  return fastify;
}

async function start() {
  let server: FastifyInstance | undefined = undefined; // Declare server here to access in catch
  try {
    server = await buildServer({
      logger: { level: 'info' }, // Basic logging, adjust as needed
      trustProxy: true, // Important if behind a proxy like GCP Load Balancer
    });

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await server.listen({ port, host: '0.0.0.0' }); 
    console.log(`Server listening on port ${port}`);
    console.log('API documentation is at http://localhost:3000/documentation');
  } catch (err) {
    console.error('Failed to start server or load secrets:', err);
    // Use server.log if server is initialized, otherwise console.error
    if (server && server.log) { // Check if server was initialized
      server.log.error(err);
    } else {
      console.error('Critical error during app initialization:', err);
    }
    process.exit(1);
  }
}

start(); 