"use strict";
/**
 * Sequelize model definition for Task
 * Represents tasks created and managed by users in the Task Management App
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const user_1 = require("./user"); // ✅ Ensure proper import
/**
 * Task model class
 * Extends Sequelize's Model to represent a task entity
 */
class Task extends sequelize_1.Model {
    /** Unique identifier for the task */
    id;
    /** Title of the task */
    title;
    /** Optional description providing more details about the task */
    description;
    /** Current status of the task: PENDING, IN_PROGRESS, or COMPLETED */
    status;
    /** Foreign key referencing the user who owns this task */
    userId;
    /** Optional user object associated with the task */
    user;
}
exports.Task = Task;
/**
 * Initializes the Task model with fields and their constraints
 */
Task.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM("PENDING", "IN_PROGRESS", "COMPLETED"),
        allowNull: false,
        defaultValue: "PENDING",
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: user_1.User,
            key: "id",
        },
    },
}, {
    sequelize: database_1.default,
    modelName: "Task",
    tableName: "tasks", // ✅ Explicit table name for clarity
});
