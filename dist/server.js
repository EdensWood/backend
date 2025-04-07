"use strict";
/**
 * Main server setup for the Task Management App
 * Includes Express app setup, Apollo GraphQL server, CORS, session handling, and database initialization.
 */
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
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const helmet_1 = __importDefault(require("helmet"));
const models_1 = require("./models");
const associations_1 = require("./models/associations");
dotenv_1.default.config();
const app = (0, express_1.default)();
/**
 * 1. Apply HTTP security headers using helmet.
 */
app.use((0, helmet_1.default)());
app.set("trust proxy", 1);
/**
 * 2. Enable body parsing for JSON and URL-encoded payloads.
 */
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
/**
 * 3. Setup PostgreSQL connection pool for session store and ORM.
 */
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? {
        rejectUnauthorized: false
    } : false
});
/**
 * 4. Configure session middleware using connect-pg-simple for PostgreSQL-backed sessions.
 */
const PGStore = (0, connect_pg_simple_1.default)(express_session_1.default);
app.use((0, express_session_1.default)({
    name: "taskmanager.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    rolling: true,
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    },
    store: new PGStore({
        pool: pgPool,
        createTableIfMissing: true,
        tableName: "user_sessions"
    })
}));
/**
 * Debug middleware to log session and cookie data.
 */
app.use((req, res, next) => {
    console.log('Session middleware - req.session:', req.session);
    console.log('Session ID:', req.sessionID);
    console.log('Cookies:', req.headers.cookie);
    next();
});
/**
 * 5. Configure CORS to allow frontend domains and support credentials.
 */
const allowedOrigins = [
    "https://www.leafywoodz.com",
    "http://localhost:3000"
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.leafywoodz.com')) {
            callback(null, true);
        }
        else {
            console.warn(`🚫 CORS blocked: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["set-cookie"],
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
app.options("*", (0, cors_1.default)(corsOptions));
/**
 * 6. Initialize Apollo Server with the provided GraphQL schema.
 */
const server = new server_1.ApolloServer({
    schema: schema_1.default,
});
/**
 * 7. Starts the server:
 *    - Authenticates and syncs database
 *    - Starts Apollo Server
 *    - Sets up GraphQL route with session context
 *    - Starts Express server
 */
const startServer = async () => {
    (0, associations_1.setupAssociations)();
    try {
        await database_1.default.authenticate();
        console.log("✅ Database connected");
        await database_1.default.sync({ alter: true });
        console.log("✅ Database synchronized");
        await server.start();
        app.use("/graphql", (0, express4_1.expressMiddleware)(server, {
            /**
             * Custom context middleware to inject user session info
             * into Apollo resolvers
             */
            context: async ({ req, res }) => {
                const customReq = req;
                const customRes = res;
                let user = null;
                if (customReq.session.userId) {
                    user = await models_1.User.findByPk(customReq.session.userId);
                    if (!user) {
                        await new Promise((resolve) => {
                            customReq.session.destroy(() => resolve());
                        });
                    }
                }
                return {
                    req: customReq,
                    res: customRes,
                    userId: customReq.session.userId,
                    user
                };
            }
        }));
        /**
         * Diagnostic route for testing session from mobile or web.
         */
        app.get('/check-session', (req, res) => {
            console.log("🔍 /check-session hit:", req.session);
            res.json({
                session: req.session,
                sessionID: req.sessionID,
                cookies: req.headers.cookie
            });
        });
        const PORT = process.env.PORT || 4000;
        app.listen(PORT, () => {
            console.log(`
        🚀 Server ready at ${process.env.BACKEND_URL || `http://localhost:${PORT}`}
        ⚡ GraphQL at /graphql
        🔐 Session secret: ${process.env.SESSION_SECRET ? "set" : "MISSING!"}
      `);
        });
    }
    catch (error) {
        console.error("❌ Server startup failed:", error);
        process.exit(1);
    }
};
startServer();
/**
 * 8. Global error handlers for uncaught exceptions and unhandled promise rejections.
 */
process.on("unhandledRejection", (err) => {
    console.error("Unhandled rejection:", err);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
});
