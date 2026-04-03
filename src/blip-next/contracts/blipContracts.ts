export type ConversationStateName =
  | 'idle'
  | 'listening'
  | 'understanding'
  | 'chatting'
  | 'clarifying'
  | 'drafting'
  | 'waiting_confirmation'
  | 'executing'
  | 'reporting_result'
  | 'repairing'
  | 'alert_mode';

export type ConversationFrame =
  | 'direct_command'
  | 'informational_query'
  | 'free_conversation'
  | 'follow_up'
  | 'correction'
  | 'confirmation'
  | 'emotional_moment'
  | 'urgent_or_safety'
  | 'unsupported_request';

export type TurnPolicy =
  | 'respond_only'
  | 'respond_and_ask'
  | 'respond_and_act'
  | 'ask_before_acting'
  | 'repair_existing_state'
  | 'route_to_fallback';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface WorkingMemory {
  active_tool: string | null;
  active_workflow: string | null;
  pending_confirmation: PendingConfirmation | null;
  last_open_panel: string | null;
  current_draft: Record<string, unknown> | null;
  current_recipient: string | null;
  current_subject: string | null;
  last_search_results: SharedObject[];
  unresolved_pronouns: string[];
  last_person_reference: string | null;
  last_item_reference: string | null;
  last_location_reference: string | null;
  repair_context: RepairContext | null;
}

export interface ConversationState {
  state: ConversationStateName;
  frame: ConversationFrame;
  turn_policy: TurnPolicy;
  tone: 'calm' | 'warm' | 'steady' | 'urgent';
  working_memory: WorkingMemory;
}

export interface SharedObject {
  id: string;
  type: string;
  label: string;
  value?: unknown;
  sourceTool?: string;
}

export interface WorkflowStep {
  id: string;
  type: 'tool_action' | 'review' | 'confirmation' | 'response';
  tool?: string;
  action?: string;
  status: 'pending' | 'ready' | 'blocked' | 'completed';
  consumes?: string[];
  produces?: string[];
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  requires_confirmation?: boolean;
}

export interface WorkflowPlan {
  id: string;
  summary: string;
  steps: WorkflowStep[];
  shared_objects: SharedObject[];
  next_step_id: string | null;
}

export interface PendingConfirmation {
  workflow_id: string;
  action_label: string;
  tool: string;
  risk_level: RiskLevel;
}

export interface ConfirmationPolicyDecision {
  required: boolean;
  reason: string;
  risk_level: RiskLevel;
  confirm_message?: string;
}

export interface RepairContext {
  target: 'draft' | 'workflow' | 'confirmation' | 'tool_state' | 'none';
  tool: string | null;
  fields: string[];
  reason: string;
  original_utterance?: string;
}

export interface ToolCapability {
  name: string;
  consumes: string[];
  produces: string[];
  actions: string[];
  risk_level: RiskLevel;
  requires_confirmation: boolean;
  ui_surface: 'panel' | 'voice' | 'background' | 'mixed';
  repairable_fields: string[];
}

export interface ParserEnvelope {
  intent_type: string;
  conversation_frame: ConversationFrame;
  tool_targets: string[];
  confidence: number;
  extracted_entities: Record<string, unknown>;
  shared_objects_in: SharedObject[];
  shared_objects_out: SharedObject[];
  requires_confirmation: boolean;
  risk_level: RiskLevel;
  repairable_fields: string[];
  execution_plan: WorkflowPlan | null;
  follow_up_needed: boolean;
  clarification_question: string | null;
  response_style: 'chatty' | 'brief' | 'confirming' | 'clarifying' | 'urgent';
  turn_policy: TurnPolicy;
  validation_errors?: string[];
}
