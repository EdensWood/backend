"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const user_1 = require("./user"); // ✅ Ensure proper import
class Task extends sequelize_1.Model {
    id;
    title;
    description;
    status;
    userId;
    user; // Optional association with User model
}
exports.Task = Task;
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
    tableName: "tasks",
});
