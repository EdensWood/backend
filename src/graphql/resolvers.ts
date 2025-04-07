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
    myTasks: async (_: any, __: any, { req, res }: MyContext) => {
      try {
        // Enhanced session logging for mobile debugging
        console.log("Mobile Session Check - ID:", req.sessionID, 
                    "User:", req.session.userId,
                    "User Agent:", req.headers?.['user-agent']);
    
        // Mobile-specific session validation
        if (!req.session.userId) {
          const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(req.headers?.['user-agent'] || '');
          
          console.error(`Unauthorized access - Mobile: ${isMobile}`, {
            session: req.session,
            headers: req.headers
          });
    
          // For mobile, consider adding additional debug headers
          if (isMobile && res) {
            res.setHeader('X-Session-Debug', JSON.stringify({
              sessionId: req.sessionID,
              userId: req.session.userId
            }));
          }
    
          throw new Error("Unauthorized");
        }
    
        // Mobile-optimized query
        const tasks = await Task.findAll({
          where: { userId: req.session.userId },
          include: [{
            model: User,
            as: "user",
            attributes: ['id', 'name'] // Only fetch needed fields
          }],
          raw: false, // Ensure we get full instances
          nest: true, // Better for mobile JSON serialization
          logging: console.log // Log the actual SQL query
        });
    
        // Mobile-friendly response formatting
        const mobileFormattedTasks = tasks.map(task => {
          // Null checks for mobile stability
          const taskData = task.get ? task.get({ plain: true }) : task;
          
          return {
            id: String(taskData.id ?? 'unknown-id'),
            title: taskData.title ?? 'Untitled Task',
            description: taskData.description ?? '',
            status: taskData.status ?? 'pending',
            user: taskData.user ? {
              id: String(taskData.user.id),
              name: taskData.user.name ?? 'Anonymous'
            } : null,
            // Mobile-specific optimizations
            ...(process.env.NODE_ENV === 'production' ? {} : {
              _debug: {
                sessionUserId: req.session.userId,
                queriedAt: new Date().toISOString()
              }
            })
          };
        });
    
        console.log(`Tasks fetched successfully - Count: ${mobileFormattedTasks.length}`);
        return mobileFormattedTasks;
    
      } catch (error) {
        // Enhanced mobile error handling
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(req.headers?.['user-agent'] || '');
        const errorMessage = isMobile 
          ? "Couldn't load tasks. Please check your connection."
          : "Failed to fetch tasks";
    
        console.error(`TASK_FETCH_ERROR [Mobile:${isMobile}]`, {
          error: error instanceof Error ? error.stack : error,
          session: req.session,
          headers: req.headers
        });
    
        throw new Error(errorMessage);
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
      const userId = req.session.userId;
      console.log("Session User ID:", userId);
      console.log("Task ID received for deletion:", id);
    
      if (!userId) throw new Error("Unauthorized");
    
      // Perform deletion only if the task belongs to the user
      const deletedCount = await Task.destroy({
        where: {
          id: Number(id),
          userId, // ensure ownership
        },
      });
    
      if (deletedCount === 0) {
        throw new Error("Task not found or unauthorized");
      }
    
      console.log(`Task with ID ${id} deleted successfully.`);
      return "Task deleted successfully";
    }
    
    
    
  },
};

export default resolvers;