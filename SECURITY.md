# Blip security

Blip can read Gmail and Calendar data, send Telegram and Gmail messages, and
make paid model requests. Treat a deployed Blip instance as a private account
surface rather than a public demo.

## Deployment boundary

- The live Nginx configuration requires HTTP Basic Authentication for the
  complete app and every `/api/` route.
- Docker publishes backend ports on `127.0.0.1` only. They must never be
  exposed directly by a cloud firewall or public load balancer.
- Standalone Node backends bind to `127.0.0.1` by default. Docker sets
  `BLIP_BACKEND_HOST=0.0.0.0` only inside each isolated container.
- Nginx limits request frequency and body size before forwarding requests.
- OAuth token files are written with owner-only permissions (`0600`).

## Required GitHub Actions secrets

The VPS deployment intentionally stops before changing the server unless all
of these secrets exist:

- `BLIP_SSH_PRIVATE_KEY`
- `BLIP_SSH_HOST`
- `BLIP_SSH_USER`
- `BLIP_BASIC_AUTH_USER`
- `BLIP_BASIC_AUTH_PASSWORD`

Use a unique high-entropy password. Do not reuse a Google, Telegram, OpenAI,
GitHub, or personal email password.

## Secret handling

- Keep runtime secrets in `.env.local`; this file is ignored by Git.
- Never place provider keys in variables beginning with `VITE_` unless the
  provider explicitly classifies the value as safe for browsers. Vite embeds
  those values in the public frontend bundle.
- After any accidental exposure, rotate the credential at the provider and
  inspect its usage. Removing a secret from the latest commit does not remove
  it from Git history.
- Keep `.blip-data/` private. It contains OAuth tokens and runtime records.

## Before any production deployment

1. Run `npm test` and `npm run build`.
2. Confirm Docker port mappings begin with `127.0.0.1:`.
3. Confirm `/etc/nginx/.htpasswd-blip` exists with mode `0640` or stricter.
4. Run `sudo nginx -t` before reloading Nginx.
5. Verify the TLS certificate chain for both `blipai.es` and
   `www.blipai.es` before enabling HSTS.

## Reporting a vulnerability

Do not open a public issue containing credentials, OAuth tokens, personal
messages, or exploit details. Revoke exposed credentials first, then contact
the repository owner privately.
