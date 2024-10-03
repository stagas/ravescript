# Vasi

## Features

### Repo

- [x] .env
- [x] Docker
  - [x] Postgres
- [x] Open in editor
- [x] Watch/refresh

### CI
- [x] GitHub actions
  - [x] Tests
  - [x] Preview with Neon DB branching
  - [x] Deploy by merging/pushing to main

### Backend

- [x] Deno
- [x] Logging (stdout)
- [x] Testing
  - [x] Coverage
  - [x] Unit
  - [ ] Integration
  - [ ] E2E
- [x] Deno KV storage
- [x] Kysley Postgres/Neon storage
  - [x] Migrations
- [x] RPC (GET/POST)
- [x] Emails (Resend)
- [x] Login/Register
  - [x] Nick, email, password
  - [x] OAuth providers
    - [x] GitHub
    - [ ] Google
    - [ ] Facebook
    - [ ] X/Twitter
- [x] Verify email
- [x] Forgot password

### Frontend

- [x] Vite
- [x] Sigui
- [x] Tailwindcss
- [x] Testing
  - [x] Coverage
  - [x] Unit
  - [ ] Integration
  - [x] E2E
- [x] HMR
- [x] RPC
- [x] Admin
  - [x] Users
  - [x] Sessions
- [x] Pages
  - [x] App
  - [x] About
  - [x] Home
- [x] Components
  - [x] Login
  - [x] Logout
  - [x] Register
  - [x] ResetPassword
  - [x] VerifyEmail
- [x] UI
  - [x] Link
- [ ] AssemblyScript

## Setup

- Create Deno Deploy project
- Create Resend project and get `RESEND_API_KEY`
- Repo -> Settings -> Secrets and variables
  - Secrets
    - Environment secrets
      - Production
        - `DATABASE_URL=[neon database url]`
      - Repository
        - `CODECOV_TOKEN=[https://app.codecov.io/github/[user]/[repo]/config/general #Tokens]`
        - `NEON_API_KEY`
  - Variables
    - `NEON_PROJECT_ID=[neon project id]`

  - `NEON_API_KEY` and `NEON_PROJECT_ID` are set automatically
    from `https://console.neon.tech/app/projects/[project-id]/integrations`
    by installing their GitHub integration.
