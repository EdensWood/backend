import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { User, Task } from "../models";
import { Request, Response } from "express";

export interface ContextType {
  req: Request;
  res: Response;
}
// Add this to your types/interfaces (or at the top of resolvers.ts)
interface JwtPayload {
  userId: string | number;
}

const resolvers = {
  Query: {
    users: async (_: any, __: any, { req }: ContextType) => {
      if (!req.session.userId) throw new Error("Unauthorized");
      return await User.findAll();
    },
    tasks: async () => await Task.findAll({ include: [{ model: User, as: "user" }] }),
    // In your resolvers.ts
    myTasks: async (_: any, __: any, { req }: { req: Request }) => {
      console.log("Session User ID:", req.session.userId);
      if (!req.session.userId) throw new Error("Unauthorized");
    
      try {
        console.log("Fetching tasks for user:", req.session.userId);
    
        const tasks = await Task.findAll({
          where: { userId: req.session.userId },
          include: [{ model: User, as: "user" }]
        });
    
        console.log("Fetched Tasks:", tasks);

        return tasks.map(task => {
          const taskData = task.get({ plain: true }); // Convert instance to object
    
          return {
            id: taskData.id.toString(),
            title: taskData.title ?? "No Title",
            description: taskData.description ?? "No Description",
            status: taskData.status ?? "UNKNOWN",
            user: {
              id: taskData.user?.id?.toString() ?? "UNKNOWN",
              name: taskData.user?.name ?? "No Name"
            }
          };
        });
      } catch (error) {
        console.error("Error fetching tasks:", error);
        throw new Error("Failed to fetch tasks");
      }
    },
    // In your me resolver
    me: async (_: any, __: any, { req }: ContextType) => {
      if (req.session.userId) {
        // Session-based auth
        return await User.findByPk(req.session.userId, { attributes: ["id", "name", "email"] });
      }
    
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '');
    
      if (!token) return null;
    
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as JwtPayload;
        return await User.findByPk(decoded.userId, { attributes: ["id", "name", "email"] });
      } catch (err) {
        console.error("JWT verification error:", err);
        return null;
      }
    }
    
  },
  Mutation: {
    // resolvers.ts - Revised Register Resolver
register: async (_: any, { name, email, password }: any) => {
  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) throw new Error("Email already exists");

    console.log('Original password:', password);
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log('Hashed password:', hashedPassword);
  
  const newUser = await User.create({
    name,
    email,
    password: hashedPassword // Ensure this is the hashed version
  });

    // Convert to plain object and handle ID conversion
    const userData = newUser.get({ plain: true });
    
    return {
      user: {
        id: userData.id, // Convert to string for GraphQL ID
        name: userData.name,
        email: userData.email
      },
      token: jwt.sign(
        { userId: userData.id },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '1h' }
      ),
      message: "Registration successful"
    };
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof Error) {
      throw new Error(`Registration failed: ${error.message}`);
    } else {
      throw new Error("Registration failed due to an unknown error");
    }
  }
},  
    
login: async (_: any, { email, password }: any, { req }: ContextType) => {
  try {
    console.log(`Login attempt for email: ${email}`);

    // 1. Find user
    const user = await User.findOne({
      where: { email },
      attributes: ["id", "name", "email", "password"],
      raw: true,
    });

    console.log("Found user:", user);
    if (!user) {
      console.log("No user found with this email");
      throw new Error("Invalid credentials");
    }

    // 2. Compare passwords
    console.log("Comparing passwords...");
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", passwordMatch);

    if (!passwordMatch) {
      console.log("Password comparison failed");
      throw new Error("Invalid credentials");
    }

    // 3. Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "1h" }
    );

    // 4. Set session
    req.session.userId = user.id;
    // After setting the session or generating the token
    console.log("User session after login:", req.session);  // For session
    console.log("Generated token:", token);  // For JWT


    return {
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
      },
      token,
      message: "Login successful",
    };
  } catch (error) {
    console.error("Detailed login error:", error);
    throw new Error(error instanceof Error ? `Login failed: ${error.message}` : "Login failed due to an unknown error");
  }
},
      logout: async (_: any, __: any, { req, res }: any) => {
        // Clear session/cookie (implementation depends on your auth)
        await new Promise<void>((resolve) => {
          req.session.destroy((err: any) => {
            res.clearCookie('your-session-cookie-name');
            resolve();
          });
        });
        return true;
      },
    createTask: async (_: any, { title, description, status }: any, { req }: ContextType) => {
      if (!req.session.userId) throw new Error("Unauthorized");
    
      try {
        // Create the task
        const newTask = await Task.create({
          title,
          description,
          status,
          userId: req.session.userId
        });
    
        // Convert to plain object and ensure ID is included
        const taskData = newTask.get({ plain: true });
    
        // Return in correct format
        return {
          id: taskData.id.toString(), // Convert to string if using GraphQL ID type
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          userId: taskData.userId
        };
      } catch (error) {
        console.error("Task creation error:", error);
        throw new Error("Failed to create task");
      }
    },
    
    
    updateTask: async (_: any, { id, title, description, status }: any, { req }: ContextType) => {
      console.log("Session User ID:", req.session.userId);
      if (!req.session.userId) throw new Error("Unauthorized");
    
      console.log("Task ID received:", id);
      const task = await Task.findByPk(Number(id), { raw: true });
      console.log("Fetched Task:", task);
    
      if (!task) throw new Error("Task not found");
      if (task.userId !== req.session.userId) throw new Error("Unauthorized access to task");
    
      await Task.update({ title, description, status }, { where: { id } });
    
      const updatedTask = await Task.findByPk(Number(id), { raw: true });
      return updatedTask;
    },
    
    
    deleteTask: async (_: any, { id }: any, { req }: ContextType) => {
      console.log("Session User ID:", req.session.userId);
      if (!req.session.userId) throw new Error("Unauthorized");
    
      console.log("Task ID received for deletion:", id);
      const task = await Task.findByPk(Number(id), { raw: true });
      console.log("Fetched Task:", task);
    
      if (!task) throw new Error("Task not found");
      if (task.userId !== req.session.userId) throw new Error("Unauthorized access to task");
    
      await Task.destroy({ where: { id } });
    
      console.log(`Task with ID ${id} deleted successfully.`);
      return "Task deleted successfully";
    },
    
    
  },
};

export default resolvers;
