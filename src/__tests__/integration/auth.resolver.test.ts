// import { createTestClient } from '@apollo/server';
// import { ApolloServer } from 'apollo-server-express';
// import typeDefs from '../../graphql/typeDefs';
// import resolvers  from '../../graphql/resolvers';
// import { createConnection, getConnection } from 'typeorm';

// describe('Auth Resolver', () => {
//   let testServer: ApolloServer;

//   beforeAll(async () => {
//     await createConnection({
//       type: 'sqlite',
//       database: ':memory:',
//       synchronize: true,
//       entities: ['src/entities/**/*.ts']
//     });

//     testServer = new ApolloServer({
//       typeDefs,
//       resolvers,
//       context: () => ({ req: { headers: {} } })
//     });
//   });

//   afterAll(async () => {
//     await getConnection().close();
//   });

//   it('should register a new user', async () => {
//     const { mutate } = createTestClient(testServer);
//     const REGISTER = `
//       mutation Register($input: RegisterInput!) {
//         register(input: $input) {
//           id
//           email
//         }
//       }
//     `;

//     const response = await mugit tate({
//       mutation: REGISTER,
//       variables: {
//         input: {
//           email: 'test@example.com',
//           password: 'password123',
//           name: 'Test User'
//         }
//       }
//     });

//     expect(response.data?.register.email).toBe('test@example.com');
//     expect(response.errors).toBeUndefined();
//   });
// });