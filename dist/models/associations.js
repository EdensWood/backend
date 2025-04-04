"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAssociations = setupAssociations;
const user_1 = require("./user");
const task_1 = require("./task");
function setupAssociations() {
    if (user_1.User.associations.tasks || task_1.Task.associations.user) {
        console.log("Associations already set up. Skipping...");
        return;
    }
    user_1.User.hasMany(task_1.Task, { foreignKey: "userId", as: "tasks" }); // ✅ Ensure unique alias
    task_1.Task.belongsTo(user_1.User, { foreignKey: "userId", as: "user" }); // ✅ Ensure unique alias
}
