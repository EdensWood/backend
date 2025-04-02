import { User } from "./user";
import { Task } from "./task";

export function setupAssociations() {
  User.hasMany(Task, { foreignKey: "userId", as: "userTasks" }); // Changed alias to 'userTasks'
  Task.belongsTo(User, { foreignKey: "userId", as: "taskOwner" }); // Changed alias to 'taskOwner'
}
