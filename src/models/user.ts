/**
 * Sequelize model definition for User
 * Represents users registered in the Task Management App
 */

import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

/**
 * User model class
 * Extends Sequelize's Model to represent a user entity
 */
class User extends Model {
  /** Unique identifier for the user */
  id!: number;

  /** Full name of the user */
  name!: string;

  /** Email address of the user */
  email!: string;

  /** Hashed password for authentication */
  password!: string;
}

/**
 * Initializes the User model with fields and constraints
 */
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true, // ✅ Ensures valid email format
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",   // ✅ Explicitly define table name
    timestamps: true,     // ✅ Automatically adds createdAt & updatedAt
  }
);

export { User };
