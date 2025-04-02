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
// Enhanced CORS configuration
app.use((0, cors_1.default)({
    origin: [
        "https://task-manager-frontend-eight-lilac.vercel.app/",
        "http://localhost:3000"
    ],
    credentials: true,
    exposedHeaders: ['set-cookie'] // Important for cookies
}));
// Session middleware with secure settings
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(express_1.default.json());
const server = new server_1.ApolloServer({ schema: schema_1.default });
const startServer = async () => {
    try {
        await database_1.default.authenticate();
        console.log("✅ Database connected successfully");
        await database_1.default.sync({ force: false });
        console.log("✅ Database synchronized");
        await server.start();
        app.use("/graphql", (0, express4_1.expressMiddleware)(server, {
            context: async ({ req, res }) => {
                return { req, res };
            },
        }));
        const PORT = process.env.PORT || 4000;
        app.listen(PORT, () => {
            console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
        });
    }
    catch (error) {
        console.error("❌ Server startup error:", error);
    }
};
startServer();
