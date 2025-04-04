import { User } from "./user";
import { Task } from "./task";

export function setupAssociations() {
  if (User.associations.tasks || Task.associations.user) {
    console.log("Associations already set up. Skipping...");
    return;
  }

  User.hasMany(Task, { foreignKey: "userId", as: "tasks" }); // ✅ Ensure unique alias
  Task.belongsTo(User, { foreignKey: "userId", as: "user" }); // ✅ Ensure unique alias
}
