import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import { User } from "./user"; // ✅ Ensure proper import

class Task extends Model {
  
  id!: number;
  title!: string;
  description!: string;
  status!: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  userId!: number;

  user?: User; // Optional association with User model
}

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
    tableName: "tasks",
  }
);

// Define association
Task.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(Task, { foreignKey: "userId", as: "tasks" });

export { Task };
