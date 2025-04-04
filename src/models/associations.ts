import { User } from "./user";
import { Task } from "./task";

export function setupAssociations() {
  User.hasMany(Task, { foreignKey: "userId", as: "tasks" }); // Changed alias to 'userTasks'
  Task.belongsTo(User, { foreignKey: "userId", as: "user" }); // Changed alias to 'taskOwner'
}
