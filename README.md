# Vasi

## Features

### Repo

- [x] .env
- [x] Docker
  - [x] Postgres
- [x] Open in editor
- [x] Watch/refresh

### CI/CD

- [x] GitHub actions
  - [x] Tests
  - [x] Preview with Neon DB branching
  - [x] Deploy by merging/pushing to main

### Backend

- [x] Deno
- [x] Logging (stdout)
- [x] COOP/COEP
- [x] Testing
  - [x] Coverage
  - [x] Unit
  - [ ] Integration
  - [ ] E2E
- [x] Deno KV storage
- [x] Kysley Postgres/Neon storage
  - [x] Migrations
  - [ ] Seeds
- [x] RPC (GET/POST)
- [x] Emails (Resend)
- [x] Auth
  - [x] Login/Register
  - [x] Nick, email, password
  - [x] Verify email
  - [x] Forgot password
  - [x] OAuth providers
    - [x] GitHub
    - [ ] Google
    - [ ] Facebook
    - [ ] X/Twitter
- [x] BroadcastChannel
- [x] WebSockets

### Frontend

- [x] PWA
- [x] Vite
  - [x] COOP/COEP
  - [x] Binary/Hex loader ?raw-hex
  - [x] Worker import
- [x] Sigui
- [x] Tailwindcss
- [x] Icons (Lucide)
- [x] Fonts
- [x] Canvas
  - [x] Wait for Fonts
  - [x] Animation
  - [x] Screen/Dims
- [x] AssemblyScript
- [x] WebAudio
  - [x] Wasm AudioWorklet
- [ ] WebGL
- [ ] WebRTC
- [x] QRCode
- [ ] Maps
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
  - [x] Chat
    - [x] Channels
    - [x] Chat
    - [x] Messages
    - [x] Users
  - [x] About
  - [x] App
  - [x] AssemblyScript
  - [x] Canvas
  - [x] Home
  - [x] OAuthRegister
  - [x] QrCode
  - [x] WebSockets
  - [ ] UI Showcase
- [x] Components
  - [x] Header
  - [x] Toast
    - [x] Catch/show errors
  - [x] Login
  - [x] Logout
  - [x] OAuthLogin
  - [x] Register
  - [x] ResetPassword
  - [x] VerifyEmail
- [x] UI
  - [x] Fieldset
  - [x] Input
  - [x] Label
  - [x] Link

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
