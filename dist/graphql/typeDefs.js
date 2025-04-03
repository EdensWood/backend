"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const typeDefs = (0, graphql_tag_1.default) `
  type User {
    id: ID!
    name: String!
    email: String!
    tasks: [Task!]
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: String!
    user: User
  }

  type AuthPayload {
    user: User!
    token: String!
    message: String!
  }

  type Query {
    users: [User!]!
    tasks: [Task!]!
    myTasks: [Task!]!
    me: User
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    createTask(title: String!, description: String, status: String!): Task!
    updateTask(id: ID!, title: String, description: String, status: String): Task!
    deleteTask(id: ID!): String!
  }
    
`;
exports.default = typeDefs;
