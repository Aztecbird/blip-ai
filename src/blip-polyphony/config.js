/**
 * Centralized config for the Polyphony ensemble.
 * Handles both Node (tests) and Browser (Vite).
 */

const getEnv = (key) => {
  // Try Vite/Browser first
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[`VITE_${key}`]) {
    return import.meta.env[`VITE_${key}`];
  }
  // Try Node process
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

export const config = {
  GEMINI_API_KEY: getEnv('GEMINI_API_KEY') || getEnv('GOOGLE_GEMINI_API_KEY'),
  ARCADE_API_KEY: getEnv('ARCADE_API_KEY'),
  GEMINI_BACKEND_PORT: getEnv('GEMINI_BACKEND_PORT') || 8793,
  IS_BROWSER: typeof window !== 'undefined'
};
