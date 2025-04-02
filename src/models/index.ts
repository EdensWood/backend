import sequelize from "../config/database";
import { User } from "./user";
import { Task } from "./task";
import { setupAssociations } from "./associations";

// Initialize models
const models = { User, Task };

// Set up associations
setupAssociations();

export { sequelize, User, Task, models };
