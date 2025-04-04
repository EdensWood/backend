import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import session from "express-session";
import cors, { CorsOptions } from "cors";
import dotenv from "dotenv";
import schema from "./graphql/schema";
import sequelize from "./config/database";
import pgSession from "connect-pg-simple";
import pg from 'pg';
const { Pool } = pg;
import helmet from "helmet";
import { User } from "./models";
import { Request, Response } from "express";
import { CustomRequest, CustomResponse, MyContext } from "./types/context";

dotenv.config();

const app = express();

// =======================
// 1. Security Middlewares
// =======================
app.use(helmet());
app.set("trust proxy", 1);

// =================
// 2. CORS Setup
// =================
const allowedOrigins = [
  "https://task-manager-frontend-eight-lilac.vercel.app",
  "https://task-manager-frontend-72dxlq3nz-leafywoods-projects.vercel.app",
  "http://localhost:3000"
];

const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (error: any, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
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

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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
const PGStore = pgSession(session);

app.use(
  session({
    name: "taskmanager.sid",
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    rolling: true,
    cookie: {
      secure: true, // Always true in production
      httpOnly: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000,
      // Remove domain completely for Vercel
      domain: undefined // Critical change!
    },
    store: new PGStore({
      pool: pgPool,
      createTableIfMissing: true,
      tableName: "user_sessions"
    })
  })
);

// Add this right after app.use(session(...))
app.use((req, res, next) => {
  console.log('Session middleware - req.session:', req.session);
  console.log('Session ID:', req.sessionID);
  console.log('Cookies:', req.headers.cookie);
  next();
});

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
const server = new ApolloServer<MyContext>({
  schema,
});

// =====================
// 7. Server Startup
// =====================
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");
    
    await sequelize.sync({ alter: true });
    console.log("✅ Database synchronized");

    await server.start();

    app.use(
      "/graphql",
      express.json(),
      expressMiddleware(server, {
        context: async ({ req, res }): Promise<MyContext> => {
          const customReq = req as unknown as CustomRequest;
          const customRes = res as unknown as CustomResponse;
          
          let user = null;
          if (customReq.session.userId) {
            user = await User.findByPk(customReq.session.userId);
            if (!user) {
              await new Promise<void>((resolve) => {
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
      }) as any
    );

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