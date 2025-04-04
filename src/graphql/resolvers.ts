import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { User, Task } from "../models";
import { MyContext } from "../types/context";


// Add this to your types/interfaces (or at the top of resolvers.ts)
interface JwtPayload {
  userId: string | number;
}

const resolvers = {
  Query: {
    users: async (_: any, __: any, { req }: MyContext) => {
      if (!req.session.userId) throw new Error("Unauthorized");
      return await User.findAll();
    },
    tasks: async () => await Task.findAll({ include: [{ model: User, as: "user" }] }),
    // In your resolvers.ts
    myTasks: async (_: any, __: any, { req }: MyContext) => {
      try {
        console.log("Session data in myTasks resolver:", req.session);
    
        if (!req.session.userId) {
          console.error("Unauthorized GraphQL access attempt");
          throw new Error("Unauthorized");
        }
    
        console.log("Fetching tasks for user:", req.session.userId);
    
        const tasks = await Task.findAll({
          where: { userId: req.session.userId },
          include: [
            {
              model: User,
              as: "user", // ✅ Matches fixed association
            },
          ],
          // ✅ Ensure Sequelize nests results properly
        });
    
        console.log("Fetched Tasks:", JSON.stringify(tasks, null, 2));
    
        return tasks.map(task => ({
          id: task.dataValues.id?.toString() ?? "UNKNOWN",
          title: task.dataValues.title ?? "No Title",
          description: task.dataValues.description ?? "No Description",
          status: task.dataValues.status ?? "UNKNOWN",
          user: task.user ? {
            id: task.user.id?.toString() ?? "UNKNOWN",
            name: task.user.name ?? "No Name"
          } : null
        }));
        
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error fetching tasks:", error.message, error.stack);
        } else {
          console.error("Error fetching tasks:", error);
        }
        throw new Error("Failed to fetch tasks");
      }
    },
    
    
    
    // In your me resolver
    me: async (_: any, __: any, { req }: MyContext) => {
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
    
login: async (_: any, { email, password }: any, { req }: MyContext) => {
  try {
    console.log(`Login attempt for email: ${email}`);

    // 1. Find user
    const user = await User.findOne({
      where: { email },
      attributes: ["id", "name", "email", "password"],
      raw: true // Must be false for sessions to work
    });

    if (!user) {
      console.error("User not found");
      throw new Error("Invalid credentials");
    }

    // Additional logging to debug
    console.log(`Retrieved user: ${JSON.stringify(user)}`);
    console.log(`Plain text password: ${password}`);
    console.log(`Hashed password: ${user.password}`);

    // 2. Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.error("Password mismatch");
      throw new Error("Invalid credentials");
    }

    // 3. Create session (CRITICAL FIX)
    req.session.userId = user.id;
    await new Promise<void>((resolve, reject) => {
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          reject(err);
        } else {
          console.log("Session saved successfully:", req.sessionID);
            console.log("Session after login:", req.session);
          resolve();
        }
      });
    });

    // 4. Generate token (optional if using sessions)
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "1h" }
    );

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
    console.error("Login error:", error);
    throw new Error("Login failed. Please try again.");
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
    createTask: async (_: any, { title, description, status }: any, { req }: MyContext) => {
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
    
    
    updateTask: async (_: any, { id, title, description, status }: any, { req }: MyContext) => {
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
    
    
    deleteTask: async (_: any, { id }: any, { req }: MyContext) => {
      console.log("Session User ID:", req.session.userId);
      if (!req.session.userId) throw new Error("Unauthorized");
    
      console.log("Task ID received for deletion:", id);
      const task = await Task.findByPk(Number(id)); // 🔥 Fix here
    
      console.log("Fetched Task:", task);
    
      if (!task) throw new Error("Task not found");
      if (task.userId !== req.session.userId) throw new Error("Unauthorized access to task");
    
      await Task.destroy({ where: { id: Number(id), userId: req.session.userId } });
    
      console.log(`Task with ID ${id} deleted successfully.`);
      return "Task deleted successfully";
    },
    
    
  },
};

export default resolvers;