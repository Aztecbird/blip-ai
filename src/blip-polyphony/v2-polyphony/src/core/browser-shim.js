/**
 * browser-shim.js
 * Provides minimal global variables required by Blip V1 services 
 * to run in a Node.js environment.
 */

if (typeof window === 'undefined') {
  global.window = {
    location: {
      origin: 'http://localhost:3000' // Default Blip dev port
    },
    localStorage: {
      getItem: () => null,
      setItem: () => null
    }
  };
}
