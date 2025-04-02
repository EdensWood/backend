import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";


class User extends Model {
  id!: number;
  name!: string;
  email!: string;
  password!: string;
}

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
    tableName: "users",  // ✅ Explicitly define table name
    timestamps: true,  // ✅ Adds createdAt & updatedAt fields
  }
);

export { User };
