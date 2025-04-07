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
import { setupAssociations } from "./models/associations";

dotenv.config();

const app = express();

// =======================
// 1. Security Middlewares
// =======================
app.use(helmet());
app.set("trust proxy", 1);

// =====================
// 2. Body Parsers Early
// =====================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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
// 4. Session Setup (before cors)
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
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000
    },
    store: new PGStore({
      pool: pgPool,
      createTableIfMissing: true,
      tableName: "user_sessions"
    })
  })
);

// Debugging logs for session
app.use((req, res, next) => {
  console.log('Session middleware - req.session:', req.session);
  console.log('Session ID:', req.sessionID);
  console.log('Cookies:', req.headers.cookie);
  next();
});

// =================
// 5. CORS Setup (after session)
// =================
const allowedOrigins = [
  "https://www.leafywoodz.com",
  "http://localhost:3000"
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.leafywoodz.com')) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization","X-Requested-With"],
  exposedHeaders: ["set-cookie"],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// =====================
// 6. Apollo Server Setup
// =====================
const server = new ApolloServer<MyContext>({
  schema,
});

// =====================
// 7. Start Server
// =====================
const startServer = async () => {
  setupAssociations();
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    await sequelize.sync({ alter: true });
    console.log("✅ Database synchronized");

    await server.start();

    app.use(
      "/graphql",
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

    // Debug route to test mobile session/cookie
    app.get('/check-session', (req: Request, res: Response) => {
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
