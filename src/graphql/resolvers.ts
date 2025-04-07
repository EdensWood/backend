import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { User, Task } from "../models";
import { MyContext } from "../types/context";

/** JWT Payload structure */
interface JwtPayload {
  userId: string | number;
}

const resolvers = {
  Query: {
    /**
     * Fetch all users (requires authentication)
     * @param _ - Unused
     * @param __ - Unused
     * @param context - GraphQL context with request object
     * @returns List of users
     */
    users: async (_: any, __: any, { req }: MyContext) => {
      if (!req.session.userId) throw new Error("Unauthorized");
      return await User.findAll();
    },

    /**
     * Fetch all tasks with associated user
     * @returns List of all tasks
     */
    tasks: async () => await Task.findAll({ include: [{ model: User, as: "user" }] }),

    /**
     * Fetch tasks created by the currently logged-in user
     * @param _ - Unused
     * @param __ - Unused
     * @param context - GraphQL context with session
     * @returns List of user’s tasks
     */
    myTasks: async (_: any, __: any, { req }: MyContext) => {
      try {
        if (!req.session.userId) throw new Error("Unauthorized");

        const tasks = await Task.findAll({
          where: { userId: req.session.userId },
          include: [{ model: User, as: "user" }],
        });

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
        console.error("Error fetching tasks:", error);
        throw new Error("Failed to fetch tasks");
      }
    },

    /**
     * Get the currently authenticated user's profile info
     * @returns The logged-in user's info or null
     */
    me: async (_: any, __: any, { req }: MyContext) => {
      if (req.session.userId) {
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
    /**
     * Register a new user
     * @param _ - Unused
     * @param args - Object with name, email, and password
     * @returns AuthPayload with token and user info
     */
    register: async (_: any, { name, email, password }: any) => {
      try {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) throw new Error("Email already exists");

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ name, email, password: hashedPassword });

        const userData = newUser.get({ plain: true });

        return {
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email
          },
          token: jwt.sign({ userId: userData.id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' }),
          message: "Registration successful"
        };
      } catch (error) {
        console.error("Registration error:", error);
        throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    /**
     * Log in a user and start a session
     * @param _ - Unused
     * @param args - Object with email and password
     * @param context - Contains session
     * @returns AuthPayload with token and user info
     */
    login: async (_: any, { email, password }: any, { req }: MyContext) => {
      try {
        const user = await User.findOne({
          where: { email },
          attributes: ["id", "name", "email", "password"],
          raw: true
        });

        if (!user) throw new Error("Invalid credentials");

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) throw new Error("Invalid credentials");

        req.session.userId = user.id;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => (err ? reject(err) : resolve()));
        });

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "1h" });

        return {
          user: { id: user.id.toString(), name: user.name, email: user.email },
          token,
          message: "Login successful"
        };
      } catch (error) {
        console.error("Login error:", error);
        throw new Error("Login failed. Please try again.");
      }
    },

    /**
     * Logs the user out by destroying the session and clearing the cookie
     * @returns True if logout was successful
     */
    logout: async (_: any, __: any, { req, res }: MyContext) => {
      return new Promise((resolve, reject) => {
        req.session.destroy(err => {
          if (err) {
            console.error("Logout error:", err);
            reject(new Error("Logout failed"));
          } else {
            res.clearCookie("qid");
            resolve(true);
          }
        });
      });
    },

    /**
     * Creates a new task for the authenticated user
     * @param _ - Unused
     * @param args - Task input: title, description, status
     * @returns The created task
     */
    createTask: async (_: any, { title, description, status }: any, { req }: MyContext) => {
      if (!req.session.userId) throw new Error("Unauthorized");

      try {
        const newTask = await Task.create({
          title,
          description,
          status,
          userId: req.session.userId
        });

        const taskData = newTask.get({ plain: true });

        return {
          id: taskData.id.toString(),
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

    /**
     * Updates an existing task belonging to the authenticated user
     * @param _ - Unused
     * @param args - Task input: id and fields to update
     * @returns Updated task
     */
    updateTask: async (_: any, { id, title, description, status }: any, { req }: MyContext) => {
      if (!req.session.userId) throw new Error("Unauthorized");

      const task = await Task.findByPk(Number(id), { raw: true });
      if (!task) throw new Error("Task not found");
      if (task.userId !== req.session.userId) throw new Error("Unauthorized access to task");

      await Task.update({ title, description, status }, { where: { id } });
      return await Task.findByPk(Number(id), { raw: true });
    },

    /**
     * Deletes a task belonging to the authenticated user
     * @param _ - Unused
     * @param args - Task ID to delete
     * @returns Success message
     */
    deleteTask: async (_: any, { id }: any, { req }: MyContext) => {
      if (!req.session.userId) throw new Error("Unauthorized");

      const deletedCount = await Task.destroy({
        where: { id: Number(id), userId: req.session.userId }
      });

      if (deletedCount === 0) throw new Error("Task not found or unauthorized");

      return "Task deleted successfully";
    }
  }
};

export default resolvers;
