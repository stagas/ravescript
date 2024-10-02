import { EMAIL_FROM } from './constants.ts'
import { env } from './env.ts'

const MAIL_ENABLED = false

type SendEmailResult = {
  ok: true,
  data: {
    id: string
  }
} | {
  ok: false,
  error: {
    statusCode: number,
    message: string
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  text
}: {
  to: string[],
  subject: string,
  html: string,
  text: string
}): Promise<SendEmailResult> {
  if (!MAIL_ENABLED) {
    console.log('Email skipped:')
    console.log({ to, subject })
    console.log('\nhtml:\n' + html)
    console.log('\ntext:\n' + text)
    return { ok: true, data: { id: 'mock' } }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
    }),
  })

  if (res.ok) {
    const data: { id: string } = await res.json()
    return { ok: true, data }
  }
  else {
    const error: { statusCode: number, message: string } = await res.json()
    return { ok: false, error }
  }
}
