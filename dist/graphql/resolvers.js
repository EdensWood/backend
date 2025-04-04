"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const resolvers = {
    Query: {
        users: async (_, __, { req }) => {
            if (!req.session.userId)
                throw new Error("Unauthorized");
            return await models_1.User.findAll();
        },
        tasks: async () => await models_1.Task.findAll({ include: [{ model: models_1.User, as: "user" }] }),
        // In your resolvers.ts
        myTasks: async (_, __, { req }) => {
            try {
                console.log("Session data in myTasks resolver:", req.session);
                if (!req.session.userId) {
                    console.error("Unauthorized GraphQL access attempt");
                    throw new Error("Unauthorized");
                }
                console.log("Fetching tasks for user:", req.session.userId);
                const tasks = await models_1.Task.findAll({
                    where: { userId: req.session.userId },
                    include: [{ model: models_1.User, as: "user" }],
                    raw: false
                });
                console.log("Fetched Tasks:", tasks);
                // Debugging: Check task structure
                tasks.forEach(task => {
                    console.log("Task Data:", task); // Log each task to inspect its structure
                });
                return tasks.map(task => {
                    // Ensure task.id exists before calling toString
                    if (!task.id) {
                        console.error("Task ID is undefined or null:", task);
                        return { id: "UNKNOWN", title: "No Title", description: "No Description", status: "UNKNOWN", user: { id: "UNKNOWN", name: "No Name" } };
                    }
                    return {
                        id: task.id.toString(), // Safely call toString
                        title: task.title ?? "No Title",
                        description: task.description ?? "No Description",
                        status: task.status ?? "UNKNOWN",
                        user: {
                            id: task.user?.id?.toString() ?? "UNKNOWN", // Safe access to task.user
                            name: task.user?.name ?? "No Name",
                        }
                    };
                });
            }
            catch (error) {
                console.error("Error fetching tasks:", error);
                throw new Error("Failed to fetch tasks");
            }
        },
        // In your me resolver
        me: async (_, __, { req }) => {
            if (req.session.userId) {
                // Session-based auth
                return await models_1.User.findByPk(req.session.userId, { attributes: ["id", "name", "email"] });
            }
            const authHeader = req.headers.authorization || '';
            const token = authHeader.replace('Bearer ', '');
            if (!token)
                return null;
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "fallback_secret");
                return await models_1.User.findByPk(decoded.userId, { attributes: ["id", "name", "email"] });
            }
            catch (err) {
                console.error("JWT verification error:", err);
                return null;
            }
        }
    },
    Mutation: {
        // resolvers.ts - Revised Register Resolver
        register: async (_, { name, email, password }) => {
            try {
                const existingUser = await models_1.User.findOne({ where: { email } });
                if (existingUser)
                    throw new Error("Email already exists");
                console.log('Original password:', password);
                const hashedPassword = await bcryptjs_1.default.hash(password, 10);
                console.log('Hashed password:', hashedPassword);
                const newUser = await models_1.User.create({
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
                    token: jsonwebtoken_1.default.sign({ userId: userData.id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' }),
                    message: "Registration successful"
                };
            }
            catch (error) {
                console.error("Registration error:", error);
                if (error instanceof Error) {
                    throw new Error(`Registration failed: ${error.message}`);
                }
                else {
                    throw new Error("Registration failed due to an unknown error");
                }
            }
        },
        // In your resolvers.ts
        login: async (_, { email, password }, { req }) => {
            try {
                const user = await models_1.User.findOne({ where: { email } });
                if (!user)
                    throw new Error("User not found");
                const validPassword = await bcryptjs_1.default.compare(password, user.password);
                if (!validPassword)
                    throw new Error("Invalid credentials");
                // Set session
                req.session.userId = user.id;
                await new Promise((resolve, reject) => {
                    req.session.save(err => {
                        if (err)
                            reject(err);
                        resolve();
                    });
                });
                return {
                    user: {
                        id: user.id.toString(),
                        name: user.name,
                        email: user.email
                    },
                    token: jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "1h" }),
                    message: "Login successful"
                };
            }
            catch (error) {
                console.error("Login error:", error);
                throw new Error(error instanceof Error ? error.message : "Login failed");
            }
        },
        logout: async (_, __, { req, res }) => {
            // Clear session/cookie (implementation depends on your auth)
            await new Promise((resolve) => {
                req.session.destroy((err) => {
                    res.clearCookie('your-session-cookie-name');
                    resolve();
                });
            });
            return true;
        },
        // In resolvers.ts
        createTask: async (_, { title, description, status }, { req }) => {
            if (!req.session.userId)
                throw new Error("Unauthorized");
            try {
                const user = await models_1.User.findByPk(req.session.userId);
                if (!user)
                    throw new Error("User not found");
                const newTask = await models_1.Task.create({
                    title,
                    description: description || "",
                    status: status || "PENDING",
                    userId: req.session.userId
                });
                return {
                    id: newTask.id.toString(),
                    title: newTask.title,
                    description: newTask.description,
                    status: newTask.status,
                    user: {
                        id: user.id.toString(),
                        name: user.name
                    }
                };
            }
            catch (error) {
                console.error("Task creation error:", error);
                throw new Error("Failed to create task");
            }
        },
        updateTask: async (_, { id, title, description, status }, { req }) => {
            console.log("Session User ID:", req.session.userId);
            if (!req.session.userId)
                throw new Error("Unauthorized");
            console.log("Task ID received:", id);
            const task = await models_1.Task.findByPk(Number(id), { raw: true });
            console.log("Fetched Task:", task);
            if (!task)
                throw new Error("Task not found");
            if (task.userId !== req.session.userId)
                throw new Error("Unauthorized access to task");
            await models_1.Task.update({ title, description, status }, { where: { id } });
            const updatedTask = await models_1.Task.findByPk(Number(id), { raw: true });
            return updatedTask;
        },
        deleteTask: async (_, { id }, { req }) => {
            console.log("Session User ID:", req.session.userId);
            if (!req.session.userId)
                throw new Error("Unauthorized");
            console.log("Task ID received for deletion:", id);
            const task = await models_1.Task.findByPk(Number(id), { raw: true });
            console.log("Fetched Task:", task);
            if (!task)
                throw new Error("Task not found");
            if (task.userId !== req.session.userId)
                throw new Error("Unauthorized access to task");
            await models_1.Task.destroy({ where: { id } });
            console.log(`Task with ID ${id} deleted successfully.`);
            return "Task deleted successfully";
        },
    },
};
exports.default = resolvers;
