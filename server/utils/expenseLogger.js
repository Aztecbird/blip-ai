const TRACKER_PORT = Number(process.env.EXPENSE_TRACKER_BACKEND_PORT || 8797);
const TRACKER_BASE_URL = process.env.EXPENSE_TRACKER_BACKEND_URL || `http://127.0.0.1:${TRACKER_PORT}`;
const TRACKER_TIMEOUT_MS = Number(process.env.EXPENSE_TRACKER_TIMEOUT_MS || 1500);

function withTimeout(signal, timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return signal;
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
  }
  return signal;
}

export async function logApiExpense(event = {}) {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      ...event,
    };

    const response = await fetch(`${TRACKER_BASE_URL}/api/expense-tracker/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: withTimeout(undefined, TRACKER_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Tracker responded with ${response.status}`);
    }
  } catch (error) {
    // Fail-safe behavior: usage logging must never break product flows.
    console.warn('[ExpenseLogger] Usage log skipped:', error?.message || String(error));
  }
}
