"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.models = exports.Task = exports.User = exports.sequelize = void 0;
const database_1 = __importDefault(require("../config/database"));
exports.sequelize = database_1.default;
const user_1 = require("./user");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return user_1.User; } });
const task_1 = require("./task");
Object.defineProperty(exports, "Task", { enumerable: true, get: function () { return task_1.Task; } });
const associations_1 = require("./associations");
// Initialize models
const models = { User: user_1.User, Task: task_1.Task };
exports.models = models;
// Set up associations
(0, associations_1.setupAssociations)();
