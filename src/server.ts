import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import schema from "./graphql/schema";
import sequelize from "./config/database";

dotenv.config();

const app = express();

// Enhanced CORS configuration
app.use(
  cors({
    origin: [
      "https://task-manager-frontend-l2cre69w0-leafywoods-projects.vercel.app",
      "http://localhost:3000"
    ],
    credentials: true,
    exposedHeaders: ['set-cookie'] // Important for cookies
  })
);

// Session middleware with secure settings
app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

app.use(express.json());

const server = new ApolloServer({ schema });

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");
    
    await sequelize.sync({ force: false });
    console.log("✅ Database synchronized");

    await server.start();
    
    app.use(
      "/graphql",
      expressMiddleware(server, {
        context: async ({ req, res }): Promise<any> => {
          return { req, res };
        },
      }) as any
    );

    const PORT = process.env.PORT || 4000;

    app.listen(PORT, () => {
      console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    console.error("❌ Server startup error:", error);
  }
};

startServer();