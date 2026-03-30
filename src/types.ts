export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'debit_card' | 'credit_card' | 'debt' | 'other';
  is_new_suggestion?: boolean;
}

export interface Event {
  id?: string;
  kind: 'expense' | 'income' | 'transfer' | 'refund' | 'debt_increase' | 'debt_payment' | 'loan_given' | 'loan_repayment_received' | 'loss';
  amount: number | null;
  currency: string;
  occurred_at: string;
  timezone: string;
  description?: string;
  category?: string;
  payment_method?: string;
  merchant?: { name: string; raw_text?: string };
  accounts: {
    primary_account_ref: Account | null;
    from_account_ref?: Account | null;
    to_account_ref?: Account | null;
  };
  receipt_image?: string;
  needs_confirmation?: boolean;
}

export interface Reminder {
  id: string;
  user_id: string;
  account_name: string;
  type: 'payment_due' | 'cutoff';
  day_of_month: number;
  advance_days: number;
  created_at: string;
}

export interface GeminiResponse {
  status: 'ready_to_confirm' | 'needs_clarification';
  operation: 'create' | 'update' | 'query' | 'create_goal' | 'batch_create' | 'create_reminder';
  follow_up_questions: string[];
  input_modalities_detected: string[];
  result: {
    create?: {
      event: Event;
    };
    batch_create?: {
      events: Event[];
    };
    update?: {
      target: { event_id: string; candidate_event_ids?: string[] };
      patch: Array<{ path: string; new_value: any }>;
    };
    query?: {
      intent: string;
      counterparty_name?: string;
      account_name?: string;
    };
    create_goal?: {
      goal: {
        name: string;
        target_amount: number;
        account_name?: string;
        deadline?: string;
        emoji?: string;
        color?: string;
      }
    };
    create_reminder?: {
      reminder: {
        account_name: string;
        type: 'payment_due' | 'cutoff';
        day_of_month: number;
        advance_days: number;
      }
    };
    user_feedback_message: string;
  };
  pending_proposals?: GeminiResponse[];
  shared_group_id?: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  created_at: string;
  completed_at?: string;
  account_name?: string;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
