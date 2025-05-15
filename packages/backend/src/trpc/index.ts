import { initTRPC, TRPCError } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import type { Session } from 'fastify'; // Import Fastify Session type

// Define a shape for the user object we expect in the session
// Matches what's defined in authRoutes.ts and imageRoutes.ts
interface SessionUser {
  userId?: string;
  // Add other properties like email, name if they are reliably in your session
}

// Define the shape of our tRPC context
export interface Context {
  req: CreateFastifyContextOptions['req'];
  res: CreateFastifyContextOptions['res'];
  session: Session & { user?: SessionUser }; // Make session available in context
  // Add other context properties if needed, e.g., db connections, services
}

// Context creation function for each request
export function createContext({ req, res }: CreateFastifyContextOptions): Context {
  return {
    req,
    res,
    session: req.session as Session & { user?: SessionUser }, // Cast to ensure user presence
  };
}

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure helpers
 * 
 * Procedures are the building blocks of your tRPC API.
 * They are just functions that run on your server, but can be called from your client with full type safety.
 */
export const router = t.router;
export const publicProcedure = t.procedure; // A public procedure that doesn't require authentication

/**
 * Protected procedure (requires user to be logged in)
 */
export const protectedProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user || !ctx.session.user.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
    }
    // Now, userId is guaranteed to be a string.
    // We can pass a refined context to the next middleware or procedure.
    return next({
      ctx: {
        ...ctx,
        session: {
          ...ctx.session,
          user: {
            ...ctx.session.user, // Spread other potential properties of user
            userId: ctx.session.user.userId, // userId is now definitely a string
          },
        },
      } as Context & { session: { user: { userId: string } & Omit<SessionUser, 'userId'> } }, // Type assertion for downstream
    });
  })
);

// --- Create the App Router ---
import { userRouter } from './routers/userRouter';

export const appRouter = router({
  user: userRouter, // Mount the userRouter under the `user` namespace
  // future routers can be added here, e.g. post: postRouter,
});

// Export type signature of an router to be used in the client
// This is the primary way tRPC achieves end-to-end type safety.
export type AppRouter = typeof appRouter; 