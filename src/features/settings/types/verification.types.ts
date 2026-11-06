export type VerificationMethod = 'email' | 'phone_call' | 'whatsapp' | 'telegram';
export interface VerificationInput {
  enabled: boolean; provider: 'twilio'; expiry_minutes: number; resend_cooldown_seconds: number;
  max_sends: number; max_checks: number; lockout_minutes: number; retention_days: number;
  fallback_to_sms: boolean; account_sid: string; service_sid: string; sender: string; template_id: string; secret: string;
}
export interface VerificationSetting extends Omit<VerificationInput, 'secret'> {
  method: VerificationMethod; secret_configured: boolean; adapter_available: boolean; generation: number;
}
export interface VerificationFormProps { setting: VerificationSetting; onExpired?: () => void }
export interface VerificationSettingsProps { role: 'admin' | 'staff'; onExpired?: () => void }
