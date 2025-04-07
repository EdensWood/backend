"use strict";
/**
 * Sequelize model definition for User
 * Represents users registered in the Task Management App
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
/**
 * User model class
 * Extends Sequelize's Model to represent a user entity
 */
class User extends sequelize_1.Model {
    /** Unique identifier for the user */
    id;
    /** Full name of the user */
    name;
    /** Email address of the user */
    email;
    /** Hashed password for authentication */
    password;
}
exports.User = User;
/**
 * Initializes the User model with fields and constraints
 */
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true, // ✅ Ensures valid email format
        },
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize: database_1.default,
    modelName: "User",
    tableName: "users", // ✅ Explicitly define table name
    timestamps: true, // ✅ Automatically adds createdAt & updatedAt
});
