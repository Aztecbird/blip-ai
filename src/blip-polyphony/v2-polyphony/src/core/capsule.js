/**
 * The Capsule is the primary unit of data that travels through the Blip Polyphony.
 * Each agent receives the capsule, adds its "partial reading," and passes it on.
 */
class Capsule {
  constructor(rawInput, origin = 'voice') {
    this.capsule_id = `cap_${Date.now()}`;
    this.user_id = 'user_main'; // Default
    this.origin = origin;
    this.raw_input = rawInput;
    
    // Circle 1: Presence
    this.perception = {
      mode: 'new_request', // e.g., 'continuation', 'new_request'
      confidence: 0,
      entities: []
    };
    
    // Circle 2: Judgment
    this.intention = {
      primary: null,
      sub_intents: [],
      confidence: 0
    };
    
    this.plan = []; // Array of step objects
    
    this.context = {
      active_thread_id: null,
      time_hint: null
    };
    
    this.safety = {
      requires_confirmation: false,
      reason: null
    };

    // Circle 3: Action
    this.status = 'initialized'; // initialized -> in_progress -> completed -> failed
    this.current_location = 'orchestrator';
    this.route_log = []; // Track which agents have touched this capsule
    this.results = []; // Collect outputs from tools
    this.errors = [];
  }

  addLog(agentName) {
    this.route_log.push({
      agent: agentName,
      timestamp: new Date().toISOString()
    });
  }
}

export default Capsule;
