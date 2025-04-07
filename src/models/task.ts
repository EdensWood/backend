/**
 * Sequelize model definition for Task
 * Represents tasks created and managed by users in the Task Management App
 */

import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";
import { User } from "./user"; // ✅ Ensure proper import

/**
 * Task model class
 * Extends Sequelize's Model to represent a task entity
 */
class Task extends Model {
  /** Unique identifier for the task */
  id!: number;

  /** Title of the task */
  title!: string;

  /** Optional description providing more details about the task */
  description!: string;

  /** Current status of the task: PENDING, IN_PROGRESS, or COMPLETED */
  status!: "PENDING" | "IN_PROGRESS" | "COMPLETED";

  /** Foreign key referencing the user who owns this task */
  userId!: number;

  /** Optional user object associated with the task */
  user?: User;
}

/**
 * Initializes the Task model with fields and their constraints
 */
Task.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false 
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "IN_PROGRESS", "COMPLETED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "Task",
    tableName: "tasks", // ✅ Explicit table name for clarity
  }
);

export { Task };
