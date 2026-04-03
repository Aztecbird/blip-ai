export function createReferenceResolver() {
  function resolve(entities = {}, state = {}) {
    const memory = state.working_memory || {};
    const resolved = { ...entities };
    const notes = [];

    if (!resolved.recipient && resolved.pronoun && memory.last_person_reference) {
      resolved.recipient = memory.last_person_reference;
      notes.push(`Resolved ${resolved.pronoun} to ${memory.last_person_reference}.`);
    }

    if (resolved.object_pronoun === 'it' && memory.last_item_reference) {
      resolved.reference_item = memory.last_item_reference;
      notes.push(`Resolved it to ${memory.last_item_reference}.`);
    }

    if (resolved.ordinal && Array.isArray(memory.last_search_results) && memory.last_search_results[resolved.ordinal - 1]) {
      const item = memory.last_search_results[resolved.ordinal - 1];
      resolved.reference_item = item.label;
      resolved.reference_item_id = item.id;
      notes.push(`Resolved item ${resolved.ordinal} to ${item.label}.`);
    }

    if (!resolved.location && memory.last_location_reference && /weather|rain|forecast/i.test(String(memory.active_workflow || ''))) {
      resolved.location = memory.last_location_reference;
      notes.push(`Reused last location ${memory.last_location_reference}.`);
    }

    if (!resolved.recipient && memory.current_recipient && /same recipient/i.test(String(entities.raw || ''))) {
      resolved.recipient = memory.current_recipient;
      notes.push(`Reused current recipient ${memory.current_recipient}.`);
    }

    return { entities: resolved, notes };
  }

  return { resolve };
}
