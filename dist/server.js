"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const express_session_1 = __importDefault(require("express-session"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const schema_1 = __importDefault(require("./graphql/schema"));
const database_1 = __importDefault(require("./config/database"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// 1. Enhanced CORS Configuration
const allowedOrigins = [
    "https://task-manager-frontend-eight-lilac.vercel.app/",
    "http://localhost:3000"
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.some(allowedOrigin => origin === allowedOrigin ||
            origin.includes(allowedOrigin.replace('https://', '').split('.')[0]))) {
            return callback(null, true);
        }
        const msg = `CORS policy blocked ${origin}`;
        return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['set-cookie']
}));
// 2. Handle preflight requests globally
app.options('*', (0, cors_1.default)());
// 3. Enhanced Session Configuration
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: process.env.NODE_ENV === 'production', // Required for Render
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        domain: process.env.NODE_ENV === "production"
            ? '.onrender.com'
            : undefined
    }
}));
// 4. Body parser middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// 5. Apollo Server Setup
const server = new server_1.ApolloServer({
    schema: schema_1.default,
    introspection: true, // Enable for production
    formatError: (error) => {
        console.error('GraphQL Error:', error);
        return {
            message: error.message,
            code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
        };
    }
});
const startServer = async () => {
    try {
        await database_1.default.authenticate();
        console.log("✅ Database connected successfully");
        await database_1.default.sync({ force: false });
        console.log("✅ Database synchronized");
        await server.start();
        // 6. GraphQL endpoint with proper CORS headers
        app.use("/graphql", (0, express4_1.expressMiddleware)(server, {
            context: async ({ req, res }) => {
                return { req, res };
            },
        }));
        // 7. Health check endpoint
        app.get('/health', (_, res) => {
            res.status(200).json({ status: 'healthy' });
        });
        const PORT = process.env.PORT || 4000;
        app.listen(PORT, () => {
            console.log(`
        🚀 Server ready at ${process.env.NODE_ENV === 'production'
                ? 'https://backend-1-ndqe.onrender.com'
                : `http://localhost:${PORT}`}/graphql
      `);
        });
    }
    catch (error) {
        console.error("❌ Server startup error:", error);
        process.exit(1);
    }
};
startServer();
