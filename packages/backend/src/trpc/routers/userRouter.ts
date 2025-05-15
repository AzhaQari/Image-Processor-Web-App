import { router, protectedProcedure } from '../index';
import { userService } from '../../services/userService'; // Assuming this path and export
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  /**
   * Query to get the current authenticated user's profile.
   */
  getMe: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.userId; // userId is guaranteed by protectedProcedure
    
    try {
      // Assuming userService.findById returns the user object or null/undefined if not found
      const user = await userService.findById(userId);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found.',
        });
      }
      
      // Return user fields consistent with userService.User type
      return {
        id: user.id, // This is the Google ID
        email: user.email,
        name: user.name,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error; // Re-throw TRPCError
      console.error('Failed to fetch user in getMe procedure:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve user profile.',
        cause: error,
      });
    }
  }),

  // Potentially other user-related procedures can be added here later
});

// Export the type of the userRouter for use in the AppRouter
export type UserRouter = typeof userRouter; 