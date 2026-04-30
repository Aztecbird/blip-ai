/**
 * Arcade Tool Policy Store
 * 
 * Defines which tools require human-in-the-loop confirmation before they can be executed.
 */

export const ARCADE_TOOL_POLICIES = {
    // Gmail Tools
    'Google.ListEmails': { risk: 'low', confirm: false },
    'Google.ListLabels': { risk: 'low', confirm: false },
    'Google.SendEmail': { risk: 'high', confirm: true, actionLabel: 'send' },
    'Google.ReplyToEmail': { risk: 'high', confirm: true, actionLabel: 'reply' },
    'Google.DeleteDraftEmail': { risk: 'medium', confirm: true, actionLabel: 'delete' },

    // Calendar Tools
    'GoogleCalendar.ListEvents': { risk: 'low', confirm: false },
    'GoogleCalendar.CreateEvent': { risk: 'high', confirm: true, actionLabel: 'schedule' },
    'GoogleCalendar.DeleteEvent': { risk: 'high', confirm: true, actionLabel: 'delete' },

    // GitHub Tools
    'Github.ListRepos': { risk: 'low', confirm: false },
    'Github.SearchRepos': { risk: 'low', confirm: false },
    'Github.CreateIssue': { risk: 'medium', confirm: true, actionLabel: 'create issue' },

    // Default policy for unknown tools
    'default': { risk: 'medium', confirm: true, actionLabel: 'execute' }
};

/**
 * Returns the policy for a given Arcade tool.
 * 
 * @param {string} toolName 
 * @returns {Object} { risk, confirm, actionLabel }
 */
export function getToolPolicy(toolName) {
    if (!toolName) return ARCADE_TOOL_POLICIES.default;
    
    // Exact match
    if (ARCADE_TOOL_POLICIES[toolName]) return ARCADE_TOOL_POLICIES[toolName];

    // Prefix match (e.g. any toolkit tool)
    const toolkit = toolName.split('.')[0];
    if (ARCADE_TOOL_POLICIES[toolkit]) return ARCADE_TOOL_POLICIES[toolkit];

    return ARCADE_TOOL_POLICIES.default;
}
