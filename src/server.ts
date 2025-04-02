import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import schema from "./graphql/schema";
import sequelize from "./config/database";
import pgSession from 'connect-pg-simple';

dotenv.config();

const app = express();

// 1. Enhanced CORS Configurations
const allowedOrigins = [
  "https://task-manager-frontend-eight-lilac.vercel.app",
  "https://task-manager-frontend-anfiixaka-leafywoods-projects.vercel.app/sign-in",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.some(allowedOrigin => 
        origin === allowedOrigin || 
        origin.includes(allowedOrigin.replace('https://', '').split('.')[0]
      ))) {
        return callback(null, true);
      }
      
      const msg = `CORS policy blocked ${origin}`;
      return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['set-cookie']
  })
);

// 2. Handle preflight requests globally
app.options('*', cors());

// 3. Enhanced Session Configuration
// import session from 'express-session';
// Initialize session store
const PGStore = pgSession(session);

app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    proxy: true, // Required for Render
    cookie: { 
      secure: true, // Must be true in production
      httpOnly: true,
      sameSite: 'none', // Required for cross-origin
      maxAge: 24 * 60 * 60 * 1000
    },
    store: new PGStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true
    })
  })
);

// 4. Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 5. Apollo Server Setup
const server = new ApolloServer({ 
  schema,
  introspection: true, // Enable for production
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    return {
      message: error.message,
      code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
    };
  }
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");
    
    await sequelize.sync({ force: false });
    console.log("✅ Database synchronized");

    await server.start();
    
    // 6. GraphQL endpoint with proper CORS headers
    app.use(
      "/graphql",
      expressMiddleware(server, {
        context: async ({ req, res }): Promise<any> => {
          return { req, res };
        },
      }) as any
    );

    // 7. Health check endpoint
    app.get('/health', (_, res) => {
      res.status(200).json({ status: 'healthy' });
    });

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`
        🚀 Server ready at ${process.env.NODE_ENV === 'production' 
          ? 'https://backend-1-ndqe.onrender.com' 
          : `http://localhost:${PORT}`}/graphql
      `);
    });
  } catch (error) {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
};

startServer();