import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import schema from "./graphql/schema";
import sequelize from "./config/database";
import pgSession from "connect-pg-simple";
import { Pool } from 'pg'; // Add this import

dotenv.config();

const app = express();

// 1. ✅ CORS Configurations
const allowedOrigins = [
  "https://task-manager-frontend-eight-lilac.vercel.app",
  "https://task-manager-frontend-gaqa2r7xi-leafywoods-projects.vercel.app/",
  "https://task-manager-frontend-anfiixaka-leafywoods-projects.vercel.app", 
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        return callback(null, true);
      }
      return callback(new Error(`🚫 CORS blocked: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["set-cookie"],
  })
);

// 2. ✅ Create a custom PG pool with SSL config
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // This bypasses SSL verification (use only for Render/Heroku)
  }
});

// 3. ✅ Session Configuration
const PGStore = pgSession(session);

app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
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
  })
);

// ... rest of your server.ts remains the same ...