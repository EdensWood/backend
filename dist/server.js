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
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const pg_1 = require("pg");
const helmet_1 = __importDefault(require("helmet"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// =======================
// 1. Security Middlewares
// =======================
app.use((0, helmet_1.default)());
app.set("trust proxy", 1); // Required for secure cookies in production
// =================
// 2. CORS Setup
// =================
const allowedOrigins = [
    "https://task-manager-frontend-eight-lilac.vercel.app",
    "https://task-manager-frontend-hrsnitads-leafywoods-projects.vercel.app",
    "https://task-manager-frontend-gaqa2r7xi-leafywoods-projects.vercel.app",
    "https://task-manager-frontend-anfiixaka-leafywoods-projects.vercel.app",
    "http://localhost:3000",
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            return callback(null, true);
        }
        console.warn(`🚫 CORS blocked: ${origin}`);
        return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["set-cookie"],
}));
app.options("*", (0, cors_1.default)()); // Handle preflight globally
// ======================
// 3. Database Connection
// ======================
const pgPool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? {
        rejectUnauthorized: false // Required for Render/Heroku
    } : false
});
// =====================
// 4. Session Setup
// =====================
const PGStore = (0, connect_pg_simple_1.default)(express_session_1.default);
app.use((0, express_session_1.default)({
    name: "taskmanager.sid", // Custom session cookie name
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true, // Required for proxies (Render, Vercel, etc.)
    rolling: true, // Renew cookie on every request
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "none", // Required for cross-site cookies
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
        domain: process.env.NODE_ENV === "production" ? ".yourdomain.com" : undefined
    },
    store: new PGStore({
        pool: pgPool,
        createTableIfMissing: true,
        tableName: "user_sessions",
        pruneSessionInterval: 60 // Cleanup expired sessions every 60 minutes
    })
}));
// =====================
// 5. Body Parsers
// =====================
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// =====================
// 6. Apollo Server Setup
// =====================
const server = new server_1.ApolloServer({
    schema: schema_1.default,
    introspection: process.env.NODE_ENV !== "production",
    formatError: (error) => {
        console.error("GraphQL Error:", error);
        return {
            message: error.message,
            code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
        };
    },
});
// =====================
// 7. Server Startup
// =====================
const startServer = async () => {
    try {
        // Database connection
        await database_1.default.authenticate();
        console.log("✅ Database connected");
        // Sync models
        await database_1.default.sync({ alter: true });
        console.log("✅ Database synchronized");
        // Start Apollo Server
        await server.start();
        // GraphQL endpoint with session debugging
        app.use("/graphql", (req, res, next) => {
            console.log("🔍 Session Debug:", {
                sessionID: req.sessionID,
                userId: req.session?.userId || null,
                cookies: req.headers.cookie,
                origin: req.headers.origin
            });
            next();
        }, (0, express4_1.expressMiddleware)(server, {
            context: async ({ req, res }) => ({ req, res }),
        }));
        // Health check endpoint
        app.get("/health", (_, res) => {
            res.status(200).json({
                status: "healthy",
                session: _.session?.userId ? "authenticated" : "anonymous"
            });
        });
        // Start server
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
// =====================
// 8. Error Handling
// =====================
process.on("unhandledRejection", (err) => {
    console.error("Unhandled rejection:", err);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
});
