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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const path_1 = __importDefault(require("path"));
const secrets_1 = require("./config/secrets");
const cookie_1 = __importDefault(require("@fastify/cookie"));
const session_1 = __importDefault(require("@fastify/session"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes")); // Import the auth routes
const multipart_1 = __importDefault(require("@fastify/multipart"));
const imageRoutes_1 = __importDefault(require("./routes/imageRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes")); // Added import
const cors_1 = __importDefault(require("@fastify/cors"));
const auth_1 = __importDefault(require("@fastify/auth"));
const sensible_1 = __importDefault(require("@fastify/sensible"));
const webSocketService_1 = require("./services/webSocketService");
// __dirname is available in CommonJS modules by default
const app = (0, fastify_1.default)({ logger: true });
// Register sensible first to make httpErrors available
app.register(sensible_1.default);
// Function to configure and register plugins, routes, etc.
function setupApp() {
    return __awaiter(this, void 0, void 0, function* () {
        // Load secrets before starting the server or registering plugins that need them
        yield (0, secrets_1.loadSecrets)();
        console.log('Successfully loaded application secrets.');
        const config = (0, secrets_1.getConfig)();
        if (config.gcpProjectId) {
            console.log(`Operating with GCP Project ID: ${config.gcpProjectId}`);
        }
        // Register CORS
        // IMPORTANT: Register CORS before routes and potentially before session/cookie if they rely on CORS headers for cross-domain scenarios
        yield app.register(cors_1.default, {
            origin: 'http://localhost:5173', // Frontend URL
            credentials: true, // Allow cookies to be sent and received
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
            allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
        });
        // Register cookie plugin
        app.register(cookie_1.default);
        // Register session plugin
        if (!config.sessionSecret) {
            throw new Error('SESSION_SECRET is not loaded. Cannot initialize session management.');
        }
        app.register(session_1.default, {
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
        app.register(auth_1.default);
        // Register fastify-multipart for file uploads
        // It's important to register this before routes that use it.
        app.register(multipart_1.default, {
        // addToBody: true, // if you want to access files via request.body.file
        // attachFieldsToBody: true, // if you want to access fields via request.body.fieldName
        // limits: { fileSize: 10 * 1024 * 1024 } // Example: 10MB limit
        });
        // Register auth routes
        app.register(authRoutes_1.default, { prefix: '/api/auth' });
        app.register(imageRoutes_1.default, { prefix: '/api/images' });
        app.register(notificationRoutes_1.default, { prefix: '/api/internal' }); // Added route
        // Register Swagger
        app.register(swagger_1.default, {
            mode: 'static',
            specification: {
                path: path_1.default.join(__dirname, 'openapi.yaml'),
                baseDir: __dirname,
            }
        });
        // Register Swagger UI
        app.register(swagger_ui_1.default, {
            routePrefix: '/documentation',
            uiConfig: {
                docExpansion: 'list',
                deepLinking: false
            },
        });
        app.get('/', (request, reply) => __awaiter(this, void 0, void 0, function* () {
            const currentConfig = (0, secrets_1.getConfig)(); // Re-fetch in case it was updated, though unlikely for this scope
            return { message: 'Hello World', projectId: currentConfig.gcpProjectId || 'Not Loaded' };
        }));
        // Placeholder for auth routes - to be implemented next
        // app.register(authRoutes, { prefix: '/api/auth' });
    });
}
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield setupApp(); // Call the setup function
        // Initialize WebSocket Server after app setup but before listen
        (0, webSocketService_1.setupWebSocketServer)(app.server, app);
        yield app.listen({ port: 3000 });
        console.log('Server is running at http://localhost:3000');
        console.log('API documentation is at http://localhost:3000/documentation');
    }
    catch (err) {
        console.error('Failed to start server or load secrets:', err);
        // Use app.log if app is initialized, otherwise console.error
        if (app && app.log) {
            app.log.error(err);
        }
        else {
            console.error('Critical error during app initialization:', err);
        }
        process.exit(1);
    }
});
start();
