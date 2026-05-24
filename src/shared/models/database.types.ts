export type EngineType = 'EXPERIENTIAL' | 'ALGORITHMIC_CREATED' | 'LIVE';
export type GoalType = 'CUT' | 'BULK' | 'MAINTENANCE';
export type TriggerType = 'WEIGHT_BASED' | 'TIME_BASED';
export type IntentTag = 'PLATEAU_BREAK' | 'TARGET_REACHED' | 'STRATEGIC_REVERSAL' | 'EVENT_MILESTONE';
export type MapStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';
export type HoldingStatus = 'NONE' | 'ACTIVE_HOLD' | 'PLATEAU_CROSSROAD';

export interface MacroMap {
  id: string;
  creator_id: string;
  name: string;
  engine_type: EngineType;
  goal_type: GoalType;
  total_duration_weeks: number;
  plateau_formula_json: any | null; // JSONB
  is_published: boolean;
  created_at?: string;
}

export interface MacroMapCheckpoint {
  id: string;
  map_id: string;
  sequence_index: number;
  trigger_type: TriggerType;
  intent_tag: IntentTag;
  trigger_weight_delta_pct: number | null;
  trigger_time_elapsed_days: number | null;
  protein_ratio: number;
  carbs_ratio: number;
  fats_ratio: number;
  calorie_delta_pct: number;
  is_outlier_flare: boolean;
  created_at?: string;
}

export interface MacroMapSubscription {
  id: string;
  user_id: string;
  map_id: string;
  status: MapStatus;
  holding_status: HoldingStatus;
  current_weight_checkpoint_index: number;
  current_time_checkpoint_index: number;
  requires_resolution: boolean;
  pending_payload: any | null; // JSONB
  started_at?: string;
  postponed_until: string | null;
}

// Extensions for existing profiles table mapping
export interface ProfileMacroExtensions {
  is_macro_locked: boolean;
  gender: 'male' | 'female' | string | null;
  height_cm: number | null;
  dob: string | null;
}

// Extensions for existing macro_history table mapping
export interface MacroHistoryExtensions {
  intent_driver: string | null;
  anomaly_note: string | null;
}

// RPC Return Types
export interface MarketplaceMacroMap {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_handle: string;
  creator_avatar: string;
  name: string;
  engine_type: EngineType;
  goal_type: GoalType;
  total_duration_weeks: number;
  subscriber_count: number;
  created_at: string;
}

export interface HistoricalLogEntry {
  created_at: string;
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
  weight: number | null;
  intent_driver: string | null;
}
