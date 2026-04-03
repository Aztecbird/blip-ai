import { getToolCapability } from '../tools/capabilities.js';

export function createConfirmationPolicy() {
  function decide({ tool, action, entities = {}, state = {} }) {
    const capability = getToolCapability(tool);

    if (!capability) {
      return { required: false, reason: 'No special confirmation rule.', risk_level: 'low' };
    }

    if (tool === 'timer' && action === 'set') {
      return { required: false, reason: 'Timers are reversible and low-risk.', risk_level: 'low' };
    }

    if (tool === 'weather') {
      return { required: false, reason: 'Weather lookups are read-only.', risk_level: 'none' };
    }

    if (tool === 'camera' && action === 'start_live') {
      return {
        required: true,
        reason: 'Live camera access can affect privacy.',
        risk_level: 'high',
        confirm_message: 'Do you want me to start the live camera feed now?',
      };
    }

    if (capability.requires_confirmation || ['send', 'delete', 'create'].includes(action)) {
      const recipient = entities.recipient ? ` to ${entities.recipient}` : '';
      return {
        required: true,
        reason: 'External communication or important state changes need confirmation.',
        risk_level: capability.risk_level,
        confirm_message: `Do you want me to ${action} in ${tool}${recipient}?`,
      };
    }

    if (state.working_memory?.pending_confirmation) {
      return {
        required: true,
        reason: 'There is already a pending confirmation.',
        risk_level: 'medium',
      };
    }

    return { required: false, reason: 'Safe to continue.', risk_level: capability.risk_level };
  }

  return { decide };
}
