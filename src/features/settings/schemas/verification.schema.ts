import { z } from 'zod';
const identifier = (max: number) => z.string().max(max).refine(value => value === '' || value.trim() !== '', 'Must not contain only whitespace.');
export const verificationSchema = z.object({
  enabled: z.boolean(), provider: z.literal('twilio'),
  expiry_minutes: z.number().int().min(2).max(10), resend_cooldown_seconds: z.number().int().min(30).max(600),
  max_sends: z.number().int().min(1).max(5), max_checks: z.number().int().min(1).max(10),
  lockout_minutes: z.number().int().min(5).max(1440), retention_days: z.number().int().min(1).max(90),
  fallback_to_sms: z.boolean(), account_sid: identifier(128), service_sid: identifier(128),
  sender: identifier(256), template_id: identifier(256), secret: identifier(4096),
});
