"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const pg_1 = require("pg"); // Add this import
dotenv_1.default.config();
const app = (0, express_1.default)();
// 1. ✅ CORS Configurations
const allowedOrigins = [
    "https://task-manager-frontend-eight-lilac.vercel.app",
    "https://task-manager-frontend-gaqa2r7xi-leafywoods-projects.vercel.app/",
    "https://task-manager-frontend-anfiixaka-leafywoods-projects.vercel.app",
    "http://localhost:3000",
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            return callback(null, true);
        }
        return callback(new Error(`🚫 CORS blocked: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["set-cookie"],
}));
// 2. ✅ Create a custom PG pool with SSL config
const pgPool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // This bypasses SSL verification (use only for Render/Heroku)
    }
});
// 3. ✅ Session Configuration
const PGStore = (0, connect_pg_simple_1.default)(express_session_1.default);
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
    },
    store: new PGStore({
        pool: pgPool, // Use the custom pool instead of conString
        createTableIfMissing: true,
        tableName: 'session' // Explicitly set table name
    }),
}));
// ... rest of your server.ts remains the same ...
