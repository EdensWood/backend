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
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const helmet_1 = __importDefault(require("helmet"));
const models_1 = require("./models");
const associations_1 = require("./models/associations");
dotenv_1.default.config();
const app = (0, express_1.default)();
// =======================
// 1. Security Middlewares
// =======================
app.use((0, helmet_1.default)());
app.set("trust proxy", 1);
// =================
// 2. CORS Setup
// =================
const allowedOrigins = [
    "https://task-manager-frontend-eight-lilac.vercel.app",
    "https://task-manager-frontend-iqll1gwpp-leafywoods-projects.vercel.app",
    "http://localhost:3000"
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    exposedHeaders: ['set-cookie']
}));
app.options("*", (0, cors_1.default)(corsOptions));
// ======================
// 3. Database Connection
// ======================
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? {
        rejectUnauthorized: false
    } : false
});
// =====================
// 4. Session Setup
// =====================
const PGStore = (0, connect_pg_simple_1.default)(express_session_1.default);
app.use((0, express_session_1.default)({
    name: "taskmanager.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    rolling: true,
    cookie: {
        secure: true, // Must be true for production
        httpOnly: true,
        sameSite: 'none', // Critical for cross-site cookies
        maxAge: 24 * 60 * 60 * 1000,
        // REMOVE domain completely for Vercel deployments
        domain: "https://task-manager-frontend-eight-lilac.vercel.app"
    },
    store: new PGStore({
        pool: pgPool,
        createTableIfMissing: true,
        tableName: "user_sessions"
    })
}));
app.use((req, res, next) => {
    console.log('Session middleware - req.session:', req.session);
    console.log('Session ID:', req.sessionID);
    console.log('Cookies:', req.headers.cookie);
    next();
});
// =====================
// 5. Body Parsers
// =====================
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
// =====================
// 6. Apollo Server Setup
// =====================
const server = new server_1.ApolloServer({
    schema: schema_1.default,
});
// =====================
// 7. Server Startup
// =====================
const startServer = async () => {
    (0, associations_1.setupAssociations)();
    try {
        await database_1.default.authenticate();
        console.log("✅ Database connected");
        await database_1.default.sync({ alter: true });
        console.log("✅ Database synchronized");
        await server.start();
        app.use("/graphql", express_1.default.json(), (0, express4_1.expressMiddleware)(server, {
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
