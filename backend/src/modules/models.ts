export interface AuthUserModel {
  sub?: string;
  email?: string;
  name?: string;
}

export interface GraphApiErrorModel {
  message?: string;
  code?: number;
  error_subcode?: number;
}

export interface ApiOperationModel {
  fun: string;
  status: 'completed' | 'failed' | 'skipped';
  result: unknown;
  error: unknown;
}

export interface WebhookCallModel {
  event?: string;
  id?: string;
  from?: string;
  duration?: number;
  session?: {
    sdp?: string;
    sdp_type?: string;
  };
}

export interface WebhookMessageModel {
  type?: string;
  from?: string;
  text?: { body?: string };
  timestamp?: string | number;
  interactive?: {
    type?: string;
    call_permission_reply?: { response?: 'accept' | 'reject' };
  };
}

export interface WebhookChangeValueModel {
  metadata?: {
    phone_number_id?: string;
    display_phone_number?: string;
  };
  calls?: WebhookCallModel[];
  statuses?: Array<{ status?: string; id?: string; duration?: number }>;
  messages?: WebhookMessageModel[];
  contacts?: Array<{ profile?: { name?: string } }>;
  message_echoes?: Array<{ text?: { body?: string }; to?: string }>;
}

export interface WebhookChangeModel {
  field?: string;
  value?: WebhookChangeValueModel;
}

export interface WebhookEntryModel {
  id?: string;
  changes?: WebhookChangeModel[];
}

export interface WebhookPayloadModel {
  object?: string;
  entry?: WebhookEntryModel[];
}
