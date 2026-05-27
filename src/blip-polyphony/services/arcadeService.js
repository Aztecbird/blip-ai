/**
 * Arcade Service Wrapper
 * 
 * Provides a clean interface for interacting with the Arcade AI SDK.
 * Handles tool execution, discovery, and authentication status.
 */

import Arcade from '@arcadeai/arcadejs';
import { getArcadeUserId } from './authMapping.js';
import { config } from '../config.js';

// Initialize the Arcade client
let client;
if (config.ARCADE_API_KEY) {
    client = new Arcade({
        apiKey: config.ARCADE_API_KEY,
    });
} else {
    console.warn('[ArcadeService] ARCADE_API_KEY missing. Using mock client.');
    client = {
        tools: {
            list: async () => [],
            execute: async () => ({ status: 'success', output: 'Mock Arcade response' })
        },
        auth: {
            status: async () => ({ authorized: true }),
            start: async () => ({ url: 'https://example.com/auth' })
        }
    };
}

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
        console.log(`[ArcadeService] Executing ${toolName} for user ${arcadeUserId}`);
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
 * Check the authorization status for a specific provider (e.g., 'google').
 * 
 * @param {string} blipUserId 
 * @param {string} provider 
 * @returns {Promise<Object>} Auth status and URL if needed
 */
export async function checkAuthStatus(blipUserId, provider = 'google') {
    const arcadeUserId = getArcadeUserId(blipUserId);
    
    try {
        const status = await client.auth.status(arcadeUserId, provider);
        return status;
    } catch (error) {
        console.error(`Error checking auth status for ${provider}:`, error);
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
