import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/form-errors";
import {
  useSaveVerificationMutation,
  useVerificationSettingsQuery,
} from "../hooks/useVerificationSettings";
import { verificationSchema } from "../schemas/verification.schema";
import type {
  VerificationFormProps,
  VerificationInput,
  VerificationSettingsProps,
} from "../types/verification.types";

const labels = {
  email: "Email",
  phone_call: "Phone call (SMS)",
  whatsapp: "WhatsApp",
  telegram: "Telegram (SMS)",
};
const fields = [
  ["account_sid", "Twilio account SID", "text"],
  ["service_sid", "Twilio Verify service SID", "text"],
  ["sender", "Sender", "text"],
  ["template_id", "Template ID", "text"],
  ["secret", "Replacement auth token", "password"],
  ["expiry_minutes", "Expiry (minutes, 2–10)", "number"],
  ["resend_cooldown_seconds", "Resend cooldown (seconds, 30–600)", "number"],
  ["max_sends", "Maximum sends (1–5)", "number"],
  ["max_checks", "Maximum checks (1–10)", "number"],
  ["lockout_minutes", "Lockout (minutes, 5–1440)", "number"],
  ["retention_days", "Local retention (days, 1–90)", "number"],
] as const;

function VerificationForm({ setting, onExpired }: VerificationFormProps) {
  const mutation = useSaveVerificationMutation();
  const [message, setMessage] = useState("");
  const [serverChanged, setServerChanged] = useState(false);
  const lastServerValue = useRef(JSON.stringify(setting));
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<VerificationInput>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { ...setting, secret: "" },
  });
  useEffect(() => {
    const current = JSON.stringify(setting);
    if (current === lastServerValue.current) return;
    if (isDirty) {
      setServerChanged(true);
    } else {
      reset({ ...setting, secret: "" });
      lastServerValue.current = current;
      setServerChanged(false);
    }
  }, [setting, isDirty, reset]);
  const submit = handleSubmit(async (input) => {
    if (serverChanged) return;
    setMessage("");
    try {
      const result = await mutation.mutateAsync({
        method: setting.method,
        input,
      });
      lastServerValue.current = JSON.stringify(result.data);
      reset({ ...result.data, secret: "" });
      setServerChanged(false);
      setMessage("Settings saved.");
      toast.success("Verification settings saved.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onExpired?.();
        setMessage("Session expired");
        return;
      }
      toast.error(
        "Unable to save verification settings. Your draft has been preserved.",
      );
      const mapped = fieldErrors(error);
      for (const field of [
        ...fields.map((item) => item[0]),
        "enabled",
        "fallback_to_sms",
      ] as const)
        if (mapped[field]) setError(field, { message: mapped[field] });
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Could not save settings. Your draft has been preserved.",
      );
    } finally {
      mutation.reset();
    }
  });
  return (
    <form
      onSubmit={submit}
      noValidate
      className="rounded-lg border border-slate-200 bg-white p-4 space-y-4"
    >
      <div>
        <h2 className="text-lg font-semibold">{labels[setting.method]}</h2>
        <p className="text-sm text-slate-600">
          {setting.enabled ? "Enabled" : "Disabled"} ·{" "}
          {setting.adapter_available
            ? "Adapter available"
            : setting.method === "whatsapp"
              ? "Adapter unavailable — Twilio may automatically send SMS. Activation requires independently verified provider configuration that prevents automatic SMS and supports consented fallback."
              : "Adapter unavailable — delivery support must be implemented before activation."}
        </p>
        <p className="text-sm text-slate-600">
          Auth token: {setting.secret_configured ? "configured" : "missing"}.
          Leave replacement blank to retain it.
        </p>
        {setting.method === "telegram" && (
          <p className="text-sm text-slate-600">
            SMS verifies access to the phone number, not a Telegram account.
          </p>
        )}
      </div>
      <fieldset disabled={mutation.isPending} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([name, label, kind]) => (
            <div key={name} className="space-y-1">
              <Label htmlFor={`${setting.method}-${name}`}>{label}</Label>
              <Input
                id={`${setting.method}-${name}`}
                type={kind}
                autoComplete={name === "secret" ? "new-password" : "off"}
                {...register(
                  name,
                  kind === "number" ? { valueAsNumber: true } : {},
                )}
                aria-invalid={!!errors[name]}
                aria-describedby={
                  errors[name] ? `${setting.method}-${name}-error` : undefined
                }
              />
              {errors[name] && (
                <p
                  id={`${setting.method}-${name}-error`}
                  className="text-sm text-red-700"
                >
                  {errors[name]?.message}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600">
          Provider: Twilio Verify. Retention applies to local metadata, not
          provider records or leads.
        </p>
        {setting.method === "whatsapp" && (
          <div>
            <Checkbox
              label="Allow SMS fallback after a failed WhatsApp attempt and visitor consent"
              {...register("fallback_to_sms")}
              aria-invalid={!!errors.fallback_to_sms}
              aria-describedby={
                errors.fallback_to_sms
                  ? `${setting.method}-fallback-error`
                  : undefined
              }
            />
            {errors.fallback_to_sms && (
              <p
                id={`${setting.method}-fallback-error`}
                className="text-sm text-red-700"
              >
                {errors.fallback_to_sms.message}
              </p>
            )}
          </div>
        )}
        <div>
          <Checkbox
            label="Enable verification"
            {...register("enabled")}
            disabled={!setting.adapter_available && !setting.enabled}
            aria-invalid={!!errors.enabled}
            aria-describedby={
              errors.enabled ? `${setting.method}-enabled-error` : undefined
            }
          />
          {errors.enabled && (
            <p
              id={`${setting.method}-enabled-error`}
              className="text-sm text-red-700"
            >
              {errors.enabled.message}
            </p>
          )}
        </div>
        <p className="text-sm text-slate-600">
          Save provider configuration first. Activation also requires a
          configured provider, credentials and deployment encryption key; the
          server checks readiness.
        </p>
      </fieldset>
      {serverChanged && (
        <div role="alert" className="text-sm text-amber-800">
          <p>
            Settings changed on the server. Your draft is preserved; reload the
            saved values before editing and saving again.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset({ ...setting, secret: "" });
              lastServerValue.current = JSON.stringify(setting);
              setServerChanged(false);
            }}
          >
            Discard draft and reload
          </Button>
        </div>
      )}
      {message && (
        <p
          role={message === "Settings saved." ? "status" : "alert"}
          className="text-sm"
        >
          {message}
        </p>
      )}
      <Button type="submit" disabled={mutation.isPending || serverChanged}>
        {mutation.isPending ? "Saving…" : `Save ${labels[setting.method]}`}
      </Button>
    </form>
  );
}

function AdminVerificationSettings({
  onExpired,
}: Pick<VerificationSettingsProps, "onExpired">) {
  const query = useVerificationSettingsQuery();
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401)
      onExpired?.();
  }, [query.error, onExpired]);
  if (query.isLoading)
    return <p role="status">Loading verification settings…</p>;
  if (query.isError)
    return (
      <div role="alert">
        <p>Could not load verification settings.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void query.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  if (!query.data?.data.length)
    return (
      <p role="alert">
        No verification methods are available. Contact an administrator.
      </p>
    );
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Configure each contact method independently. Save configuration with
        verification disabled first; the enable checkbox is applied when you
        save.
      </p>
      {query.data.data.map((setting) => (
        <VerificationForm
          key={setting.method}
          setting={setting}
          onExpired={onExpired}
        />
      ))}
    </div>
  );
}
export function VerificationSettings({
  role,
  onExpired,
}: VerificationSettingsProps) {
  if (role !== "admin")
    return (
      <p role="status">
        Only administrators can view or edit protected verification settings.
      </p>
    );
  return <AdminVerificationSettings onExpired={onExpired} />;
}
