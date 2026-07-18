import { z } from 'zod';

export const tokenExchangeSchema = z.object({
  code: z.string().min(1),
  waba_id: z.string().min(1).optional(),
  waba_ids: z.array(z.string().min(1)).optional(),
  business_id: z.string().min(1),
  ad_account_ids: z.array(z.string().min(1)).optional(),
  page_ids: z.array(z.string().min(1)).optional(),
  dataset_ids: z.array(z.string().min(1)).optional(),
  catalog_ids: z.array(z.string().min(1)).optional(),
  instagram_account_ids: z.array(z.string().min(1)).optional(),
  app_id: z.string().min(1).optional(),
  phone_number_id: z.string().min(1).optional(),
  es_option_reg: z.boolean().optional(),
  es_option_sub: z.boolean().optional(),
  es_option_calling: z.boolean().optional(),
});

export const registerSchema = z.object({
  wabaId: z.string().min(1),
  phoneId: z.string().min(1),
});

export const requestCodeSchema = z.object({
  waba_id: z.string().min(1),
  phone_number_id: z.string().min(1),
});

export const verifyCodeSchema = z.object({
  wabaId: z.string().min(1),
  phoneId: z.string().min(1),
  otpCode: z.string().min(1),
});

export const deregisterSchema = z.object({
  wabaId: z.string().min(1),
  phoneId: z.string().min(1),
});

export const sendSchema = z.object({
  waba_id: z.string().min(1),
  phone_number_id: z.string().min(1),
  dest_phone: z.string().min(1),
  message_content: z.string().min(1),
});

export const phoneConfigSchema = z.object({
  isAckBotEnabled: z.boolean(),
  phoneId: z.string().min(1),
  ackBotMessage: z.string().optional(),
});

export const callAcceptSchema = z.object({
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  callId: z.string().min(1),
  sdp: z.string().min(1),
  sdpType: z.string().optional(),
});

export const callRejectSchema = z.object({
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  callId: z.string().min(1),
});

export const callConnectSchema = z.object({
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  to: z.string().min(1),
  sdp: z.string().min(1),
  sdpType: z.string().optional(),
});

export const callTerminateSchema = z.object({
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  callId: z.string().min(1),
});

export const callPreAcceptSchema = z.object({
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  callId: z.string().min(1),
  sdp: z.string().min(1),
  sdpType: z.string().optional(),
});

export const callPermissionsQuerySchema = z.object({
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  userWaId: z.string().min(1),
});

export const callSettingsQuerySchema = z.object({
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
});

export const callSettingsUpdateSchema = z.object({
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  enabled: z.boolean(),
});

export const callPermissionRequestSchema = z.object({
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  to: z.string().min(1),
  bodyText: z.string().optional(),
});

export const paidMessagingTemplatesQuerySchema = z.object({
  waba_id: z.string().min(1),
});

export const paidMessagingSendSchema = z.object({
  waba_id: z.string().min(1),
  phone_number_id: z.string().min(1),
  template_name: z.string().min(1),
  template_language: z.string().min(1),
  recipient: z.string().min(1),
  component_params: z.array(z.unknown()).optional(),
  biz_opaque_callback_data: z.string().optional(),
});

export const webhookChallengeQuerySchema = z.object({
  'hub.mode': z.string().optional(),
  'hub.verify_token': z.string().optional(),
  'hub.challenge': z.string().optional(),
});

export type TokenExchangeInput = z.infer<typeof tokenExchangeSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type DeregisterInput = z.infer<typeof deregisterSchema>;
export type SendInput = z.infer<typeof sendSchema>;
export type PhoneConfigInput = z.infer<typeof phoneConfigSchema>;
export type CallAcceptInput = z.infer<typeof callAcceptSchema>;
export type CallRejectInput = z.infer<typeof callRejectSchema>;
export type CallConnectInput = z.infer<typeof callConnectSchema>;
export type CallTerminateInput = z.infer<typeof callTerminateSchema>;
export type CallPreAcceptInput = z.infer<typeof callPreAcceptSchema>;
export type CallPermissionsQueryInput = z.infer<typeof callPermissionsQuerySchema>;
export type CallSettingsQueryInput = z.infer<typeof callSettingsQuerySchema>;
export type CallSettingsUpdateInput = z.infer<typeof callSettingsUpdateSchema>;
export type CallPermissionRequestInput = z.infer<typeof callPermissionRequestSchema>;
export type PaidMessagingTemplatesQueryInput = z.infer<typeof paidMessagingTemplatesQuerySchema>;
export type PaidMessagingSendInput = z.infer<typeof paidMessagingSendSchema>;
export type WebhookChallengeQueryInput = z.infer<typeof webhookChallengeQuerySchema>;
