How to send emails reliably (PrivateEmail / Namecheap)

This project uses Nodemailer with PrivateEmail SMTP (mail.privateemail.com).

Required environment variables (.env.local):

- SMTP_HOST=mail.privateemail.com
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=info@pro-arbeitsschutz.com
- SMTP_PASS=your_app_password_or_mailbox_password
- SMTP_FROM=info@pro-arbeitsschutz.com
- SMTP_FROM_NAME=Pro Arbeitsschutz
- EMAIL_DEBUG_COPY=true  # optional: BCC a copy to the sender for every send

Health check:

- GET /api/health/smtp → verifies TCP + auth against current env vars.

Deliverability: set SPF, DKIM, DMARC on your domain (pro-arbeitsschutz.com)

1) SPF (TXT on root domain)

- Host: @
- Type: TXT
- Value: v=spf1 include:spf.privateemail.com -all

If you already have an SPF, merge includes (only one SPF TXT is allowed). For testing, you may start with ~all (softfail) and later switch to -all (hardfail).

2) DKIM (PrivateEmail panel)

- In PrivateEmail admin, enable DKIM for the mailbox/domain. It will provide a selector and TXT record.
- Add TXT record: Host: <selector>._domainkey, Value: the long DKIM public key.
- After propagation, PrivateEmail should show DKIM: passing.

3) DMARC (TXT on _dmarc)

- Host: _dmarc
- Type: TXT
- Value: v=DMARC1; p=none; rua=mailto:postmaster@pro-arbeitsschutz.com; ruf=mailto:postmaster@pro-arbeitsschutz.com; fo=1

Start with p=none to monitor; once SPF/DKIM pass consistently, consider p=quarantine or p=reject.

Optional alignment tips

- Use the same domain in From and envelope/Return-Path. The API sets envelope.from to SMTP_USER to align Return-Path.
- Keep From and Reply-To on the authenticated domain.

Troubleshooting delivery

- Check /api/health/smtp → ok must be true.
- Send an invoice and check server logs: [mail] sent { messageId, accepted, rejected, response }.
- If the recipient doesn’t get it:
	- Check Spam/Junk.
	- Open “Show original” (Gmail) → SPF/DKIM/DMARC must say PASS.
	- If SPF/DKIM fail, recheck DNS. DNS changes can take up to 24h; typically 5–30 minutes.
	- Temporarily set EMAIL_DEBUG_COPY=true to receive a BCC in the sender mailbox.
- Avoid link shorteners and spammy wording. Include a postal address and contact phone.

Attachments/PDFs

- This API currently sends an HTML invoice. If you attach PDFs, prefer small sizes and a filename like Rechnung-<nr>.pdf.

Support

- PrivateEmail docs: https://www.namecheap.com/support/knowledgebase/
- Nodemailer: https://nodemailer.com
