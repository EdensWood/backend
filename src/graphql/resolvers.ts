import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Task } from "../models";
import { Request, Response } from "express";

export interface ContextType {
  req: Request;
  res: Response;
  user?: { id: string | number } | null;
}

interface JwtPayload {
  userId: string | number;
}

const resolvers = {
  Query: {
    users: async (_: any, __: any, { user }: ContextType) => {
      if (!user) throw new Error("Unauthorized");
      return await User.findAll();
    },

    tasks: async () => await Task.findAll({ include: [{ model: User, as: "user" }] }),

    myTasks: async (_: any, __: any, { user }: ContextType) => {
      if (!user) throw new Error("Unauthorized");

      try {
        console.log("Fetching tasks for user:", user.id);
        const tasks = await Task.findAll({
          where: { userId: user.id },
          include: [{ model: User, as: "user" }]
        });

        console.log("Fetched Tasks:", tasks);

        return tasks.map(task => ({
          id: task.id.toString(),
          title: task.title ?? "No Title",
          description: task.description ?? "No Description",
          status: task.status ?? "UNKNOWN",
          user: {
            id: task.user?.id?.toString() ?? "UNKNOWN",
            name: task.user?.name ?? "No Name"
          }
        }));
      } catch (error) {
        console.error("Error fetching tasks:", error);
        throw new Error("Failed to fetch tasks");
      }
    },

    me: async (_: any, __: any, { user }: ContextType) => {
      if (!user) return null;
      return await User.findByPk(user.id, { attributes: ["id", "name", "email"] });
    },
  },

  Mutation: {
    register: async (_: any, { name, email, password }: any) => {
      try {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) throw new Error("Email already exists");

        console.log("Original password:", password);
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Hashed password:", hashedPassword);

        const newUser = await User.create({ name, email, password: hashedPassword });
        const userData = newUser.get({ plain: true });

        return {
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email
          },
          token: jwt.sign({ userId: userData.id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "1h" }),
          message: "Registration successful"
        };
      } catch (error) {
        console.error("Registration error:", error);
        throw new Error("Registration failed. Please try again.");
      }
    },

    login: async (_: any, { email, password }: any, { req }: ContextType) => {
      try {
        console.log(`Login attempt for email: ${email}`);

        const user = await User.findOne({ where: { email }, attributes: ["id", "name", "email", "password"] });
        if (!user) throw new Error("Invalid credentials");

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) throw new Error("Invalid credentials");

        req.session.userId = user.id;
        await new Promise<void>((resolve, reject) => {
          req.session.save(err => (err ? reject(err) : resolve()));
        });

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "1h" });

        return {
          user: { id: user.id.toString(), name: user.name, email: user.email },
          token,
          message: "Login successful",
        };
      } catch (error) {
        console.error("Login error:", error);
        throw new Error("Login failed. Please try again.");
      }
    },

    logout: async (_: any, __: any, { req, res }: ContextType) => {
      await new Promise<void>((resolve) => {
        req.session.destroy((err) => {
          res.clearCookie("connect.sid");
          resolve();
        });
      });
      return true;
    },

    createTask: async (_: any, { title, description, status }: any, { user }: ContextType) => {
      if (!user) throw new Error("Unauthorized");

      try {
        const newTask = await Task.create({
          title,
          description,
          status,
          userId: user.id
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

    updateTask: async (_: any, { id, title, description, status }: any, { user }: ContextType) => {
      if (!user) throw new Error("Unauthorized");

      const task = await Task.findByPk(Number(id));
      if (!task) throw new Error("Task not found");
      if (task.userId !== user.id) throw new Error("Unauthorized access to task");

      await task.update({ title, description, status });
      return task.get({ plain: true });
    },

    deleteTask: async (_: any, { id }: any, { user }: ContextType) => {
      if (!user) throw new Error("Unauthorized");

      const task = await Task.findByPk(Number(id));
      if (!task) throw new Error("Task not found");
      if (task.userId !== user.id) throw new Error("Unauthorized access to task");

      await task.destroy();
      return "Task deleted successfully";
    },
  },
};

export default resolvers;
