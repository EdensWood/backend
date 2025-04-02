"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAssociations = setupAssociations;
const user_1 = require("./user");
const task_1 = require("./task");
function setupAssociations() {
    user_1.User.hasMany(task_1.Task, { foreignKey: "userId", as: "userTasks" }); // Changed alias to 'userTasks'
    task_1.Task.belongsTo(user_1.User, { foreignKey: "userId", as: "taskOwner" }); // Changed alias to 'taskOwner'
}
