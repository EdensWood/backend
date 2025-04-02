// import { AuthService } from '../../auth.service';

// describe('AuthService', () => {
//   let authService: AuthService;

//   beforeEach(() => {
//     authService = new AuthService();
//   });

//   describe('hashPassword', () => {
//     it('should return a hashed password', async () => {
//       const password = 'test123';
//       const hash = await authService.hashPassword(password);
//       expect(hash).toBeDefined();
//       expect(hash).not.toEqual(password);
//     });
//   });

//   describe('comparePassword', () => {
//     it('should return true for matching passwords', async () => {
//       const password = 'test123';
//       const hash = await authService.hashPassword(password);
//       const result = await authService.comparePassword(password, hash);
//       expect(result).toBe(true);
//     });
//   });
// });