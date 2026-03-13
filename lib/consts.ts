export const NODE_ENV = process.env.NODE_ENV || 'development';

if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is not defined');
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
