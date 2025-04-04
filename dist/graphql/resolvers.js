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
                    include: [
                        {
                            model: models_1.User,
                            as: "user", // ✅ Matches fixed association
                        },
                    ],
                    raw: false, // ✅ Ensure nested data is included
                    nest: true, // ✅ Ensure Sequelize nests results properly
                });
                console.log("Fetched Tasks:", JSON.stringify(tasks, null, 2));
                return tasks.map(task => ({
                    id: task.id?.toString() ?? "UNKNOWN",
                    title: task.title ?? "No Title",
                    description: task.description ?? "No Description",
                    status: task.status ?? "UNKNOWN",
                    user: task.user ? {
                        id: task.user.id?.toString() ?? "UNKNOWN",
                        name: task.user.name ?? "No Name"
                    } : null
                }));
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error("Error fetching tasks:", error.message, error.stack);
                }
                else {
                    console.error("Error fetching tasks:", error);
                }
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
        login: async (_, { email, password }, { req }) => {
            try {
                console.log(`Login attempt for email: ${email}`);
                // 1. Find user
                const user = await models_1.User.findOne({
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
                const passwordMatch = await bcryptjs_1.default.compare(password, user.password);
                if (!passwordMatch) {
                    console.error("Password mismatch");
                    throw new Error("Invalid credentials");
                }
                // 3. Create session (CRITICAL FIX)
                req.session.userId = user.id;
                await new Promise((resolve, reject) => {
                    req.session.save((err) => {
                        if (err) {
                            console.error("Session save error:", err);
                            reject(err);
                        }
                        else {
                            console.log("Session saved successfully:", req.sessionID);
                            console.log("Session after login:", req.session);
                            resolve();
                        }
                    });
                });
                // 4. Generate token (optional if using sessions)
                const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "1h" });
                return {
                    user: {
                        id: user.id.toString(),
                        name: user.name,
                        email: user.email,
                    },
                    token,
                    message: "Login successful",
                };
            }
            catch (error) {
                console.error("Login error:", error);
                throw new Error("Login failed. Please try again.");
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
        createTask: async (_, { title, description, status }, { req }) => {
            if (!req.session.userId)
                throw new Error("Unauthorized");
            try {
                // Create the task
                const newTask = await models_1.Task.create({
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
