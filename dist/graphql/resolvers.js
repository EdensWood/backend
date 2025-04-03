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
        users: async (_, __, { user }) => {
            if (!user)
                throw new Error("Unauthorized");
            return await models_1.User.findAll();
        },
        tasks: async () => await models_1.Task.findAll({ include: [{ model: models_1.User, as: "user" }] }),
        myTasks: async (_, __, { user }) => {
            if (!user)
                throw new Error("Unauthorized");
            try {
                console.log("Fetching tasks for user:", user.id);
                const tasks = await models_1.Task.findAll({
                    where: { userId: user.id },
                    include: [{ model: models_1.User, as: "user" }]
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
            }
            catch (error) {
                console.error("Error fetching tasks:", error);
                throw new Error("Failed to fetch tasks");
            }
        },
        me: async (_, __, { user }) => {
            if (!user)
                return null;
            return await models_1.User.findByPk(user.id, { attributes: ["id", "name", "email"] });
        },
    },
    Mutation: {
        register: async (_, { name, email, password }) => {
            try {
                const existingUser = await models_1.User.findOne({ where: { email } });
                if (existingUser)
                    throw new Error("Email already exists");
                console.log("Original password:", password);
                const hashedPassword = await bcryptjs_1.default.hash(password, 10);
                console.log("Hashed password:", hashedPassword);
                const newUser = await models_1.User.create({ name, email, password: hashedPassword });
                const userData = newUser.get({ plain: true });
                return {
                    user: {
                        id: userData.id,
                        name: userData.name,
                        email: userData.email
                    },
                    token: jsonwebtoken_1.default.sign({ userId: userData.id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "1h" }),
                    message: "Registration successful"
                };
            }
            catch (error) {
                console.error("Registration error:", error);
                throw new Error("Registration failed. Please try again.");
            }
        },
        login: async (_, { email, password }, { req }) => {
            try {
                console.log(`Login attempt for email: ${email}`);
                const user = await models_1.User.findOne({ where: { email }, attributes: ["id", "name", "email", "password"] });
                if (!user)
                    throw new Error("Invalid credentials");
                const passwordMatch = await bcryptjs_1.default.compare(password, user.password);
                if (!passwordMatch)
                    throw new Error("Invalid credentials");
                req.session.userId = user.id;
                await new Promise((resolve, reject) => {
                    req.session.save(err => (err ? reject(err) : resolve()));
                });
                const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "1h" });
                return {
                    user: { id: user.id.toString(), name: user.name, email: user.email },
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
            await new Promise((resolve) => {
                req.session.destroy((err) => {
                    res.clearCookie("connect.sid");
                    resolve();
                });
            });
            return true;
        },
        createTask: async (_, { title, description, status }, { user }) => {
            if (!user)
                throw new Error("Unauthorized");
            try {
                const newTask = await models_1.Task.create({
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
            }
            catch (error) {
                console.error("Task creation error:", error);
                throw new Error("Failed to create task");
            }
        },
        updateTask: async (_, { id, title, description, status }, { user }) => {
            if (!user)
                throw new Error("Unauthorized");
            const task = await models_1.Task.findByPk(Number(id));
            if (!task)
                throw new Error("Task not found");
            if (task.userId !== user.id)
                throw new Error("Unauthorized access to task");
            await task.update({ title, description, status });
            return task.get({ plain: true });
        },
        deleteTask: async (_, { id }, { user }) => {
            if (!user)
                throw new Error("Unauthorized");
            const task = await models_1.Task.findByPk(Number(id));
            if (!task)
                throw new Error("Task not found");
            if (task.userId !== user.id)
                throw new Error("Unauthorized access to task");
            await task.destroy();
            return "Task deleted successfully";
        },
    },
};
exports.default = resolvers;
