import { createTRPCReact, httpBatchLink, loggerLink } from '@trpc/react-query';
import type { AppRouter } from '../../../backend/src/trpc'; // Adjust path if necessary

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser should use relative path
    return '';
  }
  // Server should use absolute path
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT ?? 3000}`;
}

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === 'development' ||
        (opts.direction === 'down' && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers() {
        return {
          // Authorization: getAuthCookie(), // If you were using token auth
        };
      },
      // You can pass CSP headers if needed here
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          credentials: 'include', // Ensure cookies are sent
        });
      }
    }),
  ],
}); 