// Direct Resend API client — replaces @lovable.dev/email-js's sendLovableEmail(),
// which authenticated via LOVABLE_API_KEY, a credential Lovable auto-injects into
// its own hosting runtime and never exposes as a copyable value (confirmed via a
// real rotation attempt — the new key still wasn't retrievable). Once Spott is
// hosted anywhere outside Lovable, that call had no way to authenticate at all.
//
// Mirrors the calling shape the pgmq email queue processor
// (src/routes/lovable/email/queue/process.ts) already expects — throws an error
// object with `status`/`retryAfterSeconds` so its existing isRateLimited/
// isForbidden/getRetryAfterSeconds helpers keep working unchanged.

export type ResendEmailPayload = {
  to: string
  from: string
  subject: string
  html?: string
  text?: string
  idempotency_key?: string
}

export class EmailSendError extends Error {
  status: number
  retryAfterSeconds: number | null
  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message)
    this.name = 'EmailSendError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export async function sendResendEmail(payload: ResendEmailPayload, opts: { apiKey: string }): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
      ...(payload.idempotency_key ? { 'Idempotency-Key': payload.idempotency_key } : {}),
    },
    body: JSON.stringify({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  })
  if (res.ok) return

  const body = await res.json().catch(() => ({}) as any)
  const retryAfterHeader = res.headers.get('retry-after')
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : null
  throw new EmailSendError(body?.message || `Resend API error (${res.status})`, res.status, retryAfterSeconds)
}
