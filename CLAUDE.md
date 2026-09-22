# Pages CMS (self-hosted fork)

Fork of hunvreus/pagescms, deployed for our own use.

## Deployment

- Live CMS: https://cms.testmywork.xyz
- Hosted on Railway. It auto-deploys the `main` branch of `origin`
  (github.com/T-LakshanOrg/pagescms-selfhosted). Merging to `main` is the deploy.
- `upstream` is hunvreus/pagescms; merge it into `main` to pick up releases.
- `old-fork` (t-lakshan/pagescms) is the previous personal fork. Do not push there.

## Local development

- `next dev` cannot sign in: the GitHub App callback points at the live URL.
  Verify with `npm run lint` and `npx next build`; test in the browser on the live URL after deploy.
- `.env.local` holds the live instance's settings. Never commit it.
- Setup log and Railway runbook live in the Hartwell & Grove site repo under `docs/`.
