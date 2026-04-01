const TRACKER_PORT = Number(window.localStorage?.getItem('blip_expense_tracker_backend_port') || 8797);
const TRACKER_BASE = (() => {
  const configured = String(window.localStorage?.getItem('blip_expense_tracker_backend_url') || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  return `http://127.0.0.1:${TRACKER_PORT}`;
})();

export async function logApiExpense(event = {}) {
  try {
    await fetch(`${TRACKER_BASE}/api/expense-tracker/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        ...event,
      }),
    });
  } catch (_) {
    // Silent fail-safe. Usage logging should never block UX flows.
  }
}
