import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import schema from "./graphql/schema";
import sequelize from "./config/database";
import pgSession from "connect-pg-simple";
import pg from 'pg';
const { Pool } = pg;
import helmet from "helmet";

dotenv.config();

const app = express();

// =======================
// 1. Security Middlewares
// =======================
app.use(helmet());
app.set("trust proxy", 1); // Required for secure cookies in production

// =================
// 2. CORS Setup
// =================
const allowedOrigins = [
  "https://task-manager-frontend-eight-lilac.vercel.app",
];

app.use(
  cors({
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
  })
);

app.options("*", cors()); // Handle preflight globally

// ======================
// 3. Database Connection
// ======================
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? {
    rejectUnauthorized: false // Required for Render/Heroku
  } : false
});

// =====================
// 4. Session Setup
// =====================
const PGStore = pgSession(session);

app.use(
  session({
    name: "connect.sid", // Custom session cookie name
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    proxy: true, // Required for proxies (Render, Vercel, etc.)
    rolling: true, // Renew cookie on every request
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "none", // Required for cross-site cookies
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      domain: process.env.NODE_ENV === "production" ? "yourdomain.com" : undefined
    },
    store: new PGStore({
      pool: pgPool,
      createTableIfMissing: true,
      tableName: "user_sessions",
      pruneSessionInterval: 60 // Cleanup expired sessions every 60 minutes
    })
  })
);

// =====================
// 5. Body Parsers
// =====================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
// =====================
// 6. Apollo Server Setup
// =====================
const server = new ApolloServer({
  schema,
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
    await sequelize.authenticate();
    console.log("✅ Database connected");
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log("✅ Database synchronized");

    // Start Apollo Server
    await server.start();

    // GraphQL endpoint with session debugging
    app.use(
      "/graphql",
      cors({
        origin: allowedOrigins, // Single origin
        credentials: true, // Must be true for cookies
      }),
      express.json(),
      expressMiddleware(server, {
        context: async ({ req, res }) => {
          console.log("Session Debugging:", req.session);
          const userId = req.session?.userId;
          return { req, res, user: userId ? { id: userId } : null };
        },
      }) as any
    );
    

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

  } catch (error) {
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