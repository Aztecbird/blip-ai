/**
 * Arcade Service Wrapper
 * 
 * Provides a clean interface for interacting with the Arcade AI SDK.
 * Handles tool execution, discovery, and authentication status.
 */

import Arcade from '@arcadeai/arcadejs';
import { getArcadeUserId } from './authMapping.js';

/** Vite injects `import.meta.env`; Node tests only have `process.env`. */
function resolveArcadeApiKey() {
    const fromVite =
        typeof import.meta !== 'undefined' && import.meta.env
            ? String(import.meta.env.VITE_ARCADE_API_KEY || '').trim()
            : '';
    if (fromVite) return fromVite;
    if (typeof process !== 'undefined' && process.env) {
        const k = process.env.VITE_ARCADE_API_KEY || process.env.ARCADE_API_KEY;
        return String(k || '').trim();
    }
    return '';
}

const client = new Arcade({
    apiKey: resolveArcadeApiKey()
});

/**
 * List all available tools from Arcade.
 * Useful for debugging and for the LLM to know its capabilities.
 */
export async function listTools() {
    try {
        const response = await client.tools.list();
        return response;
    } catch (error) {
        console.error('Error listing Arcade tools:', error);
        throw error;
    }
}

/**
 * Execute a tool via Arcade for a specific Blip user.
 * 
 * @param {string} blipUserId - The Blip user ID
 * @param {string} toolName - The name of the tool to execute (e.g., 'Google.ListEmails')
 * @param {Object} inputs - The arguments for the tool
 * @returns {Promise<Object>} The tool execution results
 */
export async function executeTool(blipUserId, toolName, inputs = {}) {
    const arcadeUserId = getArcadeUserId(blipUserId);
    
    try {
        console.log(`Executing Arcade tool ${toolName} for user ${arcadeUserId}`);
        const response = await client.tools.execute({
            tool_name: toolName,
            user_id: arcadeUserId,
            input: inputs
        });

        // The SDK might return an error structure even in a 200/success response sometimes
        if (response.status === 'failed') {
          return {
            success: false,
            error: response.error,
            toolName
          };
        }

        return {
            success: true,
            data: response.output,
            toolName
        };

    } catch (error) {
        // Handle "Requires Auth" scenario
        if (error.status === 401 || error.name === 'UnauthorizedError' || (error.message && error.message.toLowerCase().includes('auth'))) {
            let provider = toolName.split('.')[0].toLowerCase();
            
            // Map common toolkit names to base providers
            if (provider.includes('google')) provider = 'google';
            if (provider.includes('github')) provider = 'github';
            if (provider.includes('slack')) provider = 'slack';

            const authUrl = await getAuthUrl(blipUserId, provider);
            return {
                success: false,
                requires_auth: true,
                auth_url: authUrl,
                toolName
            };
        }

        // Handle "Missing Input" scenario (400 Bad Request)
        if (error.status === 400 || (error.message && error.message.includes('missing required input'))) {
            return {
                success: false,
                missing_inputs: true,
                error: error.message,
                toolName
            };
        }

        console.error(`Error executing tool ${toolName}:`, error);
        return {
            success: false,
            error: error.message,
            toolName
        };
    }
}

/**
 * Poll an authorization flow by id (from `auth.start` or a tool authorization response).
 * SDK: `client.auth.status({ id, wait? })` — not `(userId, provider)`.
 *
 * @param {string} authFlowId
 * @param {number} [waitSeconds] - Optional long-poll wait (max 59 per API).
 * @returns {Promise<Object>}
 */
export async function checkAuthStatus(authFlowId, waitSeconds) {
    try {
        const query = { id: String(authFlowId) };
        if (waitSeconds != null && Number.isFinite(Number(waitSeconds))) {
            query.wait = Math.min(59, Math.max(0, Math.floor(Number(waitSeconds))));
        }
        return await client.auth.status(query);
    } catch (error) {
        console.error('Error checking Arcade auth flow status:', error);
        throw error;
    }
}

/**
 * Start an OAuth flow for a specific provider.
 * 
 * @param {string} blipUserId 
 * @param {string} provider 
 * @returns {Promise<string>} The authorization URL
 */
export async function getAuthUrl(blipUserId, provider = 'google') {
    const arcadeUserId = getArcadeUserId(blipUserId);
    
    try {
        const authResponse = await client.auth.start(arcadeUserId, provider);
        return authResponse.url;
    } catch (error) {
        console.error(`Error starting auth flow for ${provider}:`, error);
        throw error;
    }
}

export default {
    listTools,
    executeTool,
    checkAuthStatus,
    getAuthUrl
};
