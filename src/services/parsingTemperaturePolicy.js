const DEFAULT_CORE_COMMAND_TEMPERATURE = 0.03;
const DEFAULT_STRUCTURED_TASK_TEMPERATURE = 0.2;
const CORE_COMMAND_TEMPERATURE_CAP = 0.08;
const STRUCTURED_TASK_TEMPERATURE_CAP = 0.35;

function readStoredParsingTemperature() {
    try {
        const raw = window?.localStorage?.getItem('blip_parsing_temperature');
        const parsed = parseFloat(String(raw ?? ''));
        if (!Number.isFinite(parsed)) return null;
        return parsed;
    } catch (_) {
        return null;
    }
}

export function getCoreCommandParsingTemperature() {
    const stored = readStoredParsingTemperature();
    if (!Number.isFinite(stored)) return DEFAULT_CORE_COMMAND_TEMPERATURE;
    return Math.min(CORE_COMMAND_TEMPERATURE_CAP, Math.max(0, stored));
}

export function getStructuredTaskTemperature() {
    const stored = readStoredParsingTemperature();
    if (!Number.isFinite(stored)) return DEFAULT_STRUCTURED_TASK_TEMPERATURE;
    return Math.min(STRUCTURED_TASK_TEMPERATURE_CAP, Math.max(0, stored));
}

export const PARSING_TEMPERATURE_POLICY = Object.freeze({
    core_command_default: DEFAULT_CORE_COMMAND_TEMPERATURE,
    core_command_cap: CORE_COMMAND_TEMPERATURE_CAP,
    structured_task_default: DEFAULT_STRUCTURED_TASK_TEMPERATURE,
    structured_task_cap: STRUCTURED_TASK_TEMPERATURE_CAP,
});
