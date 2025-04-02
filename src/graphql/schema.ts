import { makeExecutableSchema } from "@graphql-tools/schema";
import typeDefs from "./typeDefs"; // Ensure this contains your GraphQL SDL schema
import resolvers from "./resolvers"; // Ensure this contains your resolvers

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

export default schema;
