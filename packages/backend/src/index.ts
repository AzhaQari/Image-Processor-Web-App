import fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import path from 'path';
import { loadSecrets, getConfig } from './config/secrets';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import authRoutes from './routes/authRoutes'; // Import the auth routes
import fastifyMultipart from '@fastify/multipart';
import imageRoutes from './routes/imageRoutes';
import fastifyCors from '@fastify/cors';

// __dirname is available in CommonJS modules by default

const app = fastify({ logger: true });

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
  await app.register(fastifyCors, {
    origin: 'http://localhost:5173', // Frontend URL
    credentials: true, // Allow cookies to be sent and received
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  });

  // Register cookie plugin
  app.register(cookie);

  // Register session plugin
  if (!config.sessionSecret) {
    throw new Error('SESSION_SECRET is not loaded. Cannot initialize session management.');
  }
  app.register(session, {
    secret: config.sessionSecret,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Send cookie only over HTTPS in production
      httpOnly: true, // Prevents client-side JS from accessing the cookie
      maxAge: 24 * 60 * 60 * 1000 // Session TTL: 1 day
    },
    // saveUninitialized: false, // Don't save sessions that are new but not modified
    // resave: false, // Don't resave session if not modified
  });

  // Register fastify-multipart for file uploads
  // It's important to register this before routes that use it.
  app.register(fastifyMultipart, {
    // addToBody: true, // if you want to access files via request.body.file
    // attachFieldsToBody: true, // if you want to access fields via request.body.fieldName
    // limits: { fileSize: 10 * 1024 * 1024 } // Example: 10MB limit
  });

  // Register auth routes
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(imageRoutes, { prefix: '/api/images' });

  // Register Swagger
  app.register(swagger, {
    mode: 'static',
    specification: {
      path: path.join(__dirname, 'openapi.yaml'),
      baseDir: __dirname,
    }
  });

  // Register Swagger UI
  app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
  });

  app.get('/', async (request, reply) => {
    const currentConfig = getConfig(); // Re-fetch in case it was updated, though unlikely for this scope
    return { message: 'Hello World', projectId: currentConfig.gcpProjectId || 'Not Loaded' };
  });

  // Placeholder for auth routes - to be implemented next
  // app.register(authRoutes, { prefix: '/api/auth' });
}

const start = async () => {
  try {
    await setupApp(); // Call the setup function

    await app.listen({ port: 3000 });
    console.log('Server is running at http://localhost:3000');
    console.log('API documentation is at http://localhost:3000/documentation');
  } catch (err) {
    console.error('Failed to start server or load secrets:', err);
    // Use app.log if app is initialized, otherwise console.error
    if (app && app.log) {
      app.log.error(err);
    } else {
      console.error('Critical error during app initialization:', err);
    }
    process.exit(1);
  }
};

start(); 