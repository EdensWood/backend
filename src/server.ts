import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import session from "express-session";
import cors, { CorsOptions, CorsRequest } from "cors";
import dotenv from "dotenv";
import schema from "./graphql/schema";
import sequelize from "./config/database";
import pgSession from "connect-pg-simple";
import pg from 'pg';
const { Pool } = pg;
import helmet from "helmet";
import { User } from "./models";
import { Request,Response } from "express";
import { CustomRequest, CustomResponse, MyContext } from "./types/context";

dotenv.config();



type ApolloContext = {
  req: Partial<Request> & { session: any };
  res: Partial<Response>;
  userId?: number;
  user?: User | null;
};

const app = express();

const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (error: any, allow?: boolean) => void) => {
    // Allow specific origins or all origins
    if (origin && origin === 'https://your-allowed-origin.com') {
      callback(null, true); // Allow the origin
    } else {
      callback(new Error('Not allowed by CORS')); // Reject the origin
    }
  },
  credentials: true, // Allow credentials (cookies, authorization headers)
  optionsSuccessStatus: 200, // Handle preflight requests correctly
};

// =======================
// 1. Security Middlewares
// =======================
app.use(helmet());
app.set("trust proxy", 1); // Required for secure cookies in production

// =================
// 2. CORS Setup
// =================
const allowedOrigins = [
  "https://task-manager-frontend-gkhoexaa1-leafywoods-projects.vercel.app",
  "https://task-manager-frontend-eight-lilac.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || 
          allowedOrigins.some(allowed => origin.startsWith(allowed))) {
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

// Update your session configuration
app.use(
  session({
    name: "taskmanager.sid",
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false, // Changed to false for security
    proxy: true,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day (reduced from 1 week)
      domain: process.env.NODE_ENV === "production" ? ".yourdomain.com" : undefined // Set your domain
    },
    store: new PGStore({
      pool: pgPool,
      createTableIfMissing: true,
      tableName: "user_sessions",
      pruneSessionInterval: 60
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
const server = new ApolloServer<MyContext>({
  schema,
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
        origin: allowedOrigins,
        credentials: true
      }),
      express.json(),
      expressMiddleware(server, {
        context: async ({ req, res }): Promise<MyContext> => {
          // Type assertions here
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