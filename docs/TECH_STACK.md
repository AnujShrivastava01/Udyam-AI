# Tech stack

Everything actually installed and used, with versions read from `package.json` on 2026-09-05.
Nothing aspirational — a stack slide listing a technology nobody wired up is the easiest claim in a
submission to get caught on. Section 8 says what is deliberately absent.

---

## 1. Frontend

| Technology | Version | Why it is here |
|---|---|---|
| **Next.js** | 16.3.4 | App Router, Turbopack. Server routes and the UI in one deployable. |
| **React** | 19.2.8 | — |
| **TypeScript** | 5.x | Strict. The finance kernel's types are the contract — `marginCapital: number \| null` is enforced, not documented. |
| **Tailwind CSS** | 4.x | Theme tokens in `globals.css`, no config file. |
| **shadcn/ui** | 4.21.0 | Component layer. |
| **Base UI** | 1.8.0 | The primitives under shadcn (Select, Dialog, Slider). |
| **Recharts** | 3.10.1 | Schedule chart, cliff chart, saturation chart. |
| **Framer Motion** | 13.2.0 | Entrance transitions, all inside the reduced-motion guard. |
| **Lenis** | 1.3.26 | Momentum scrolling, disabled on `prefers-reduced-motion`. |
| **Lucide** | 1.41.0 | Icons. |
| **zustand** | 5.0.15 | State, persisted to `localStorage` with a versioned `migrate`. |
| **clsx / tailwind-merge / cva** | — | Class composition. |

Runtime: **Node 22.22**. 85 TypeScript/TSX files.

## 2. AI and speech

| Technology | Model / version | Role |
|---|---|---|
| **Google Gemini** | `gemini-2.5-pro` | Narration, and voice-agent intent classification |
| **Vertex AI** | REST, location `global` | Model hosting |
| **google-auth-library** | 9.15.1 | Service-account auth |
| **@google-cloud/vertexai** | 1.12.0 | Installed alongside the REST client |
| **Sarvam AI — bulbul:v3** | speaker `rupali` | Text to speech, 22.05 kHz WAV |
| **Sarvam AI — saarika:v2.5** | — | Speech to text, multipart |
| **Sarvam AI — sarvam-m** | — | Fallback narrator, implemented, not wired |
| **Bhashini (GoI ULCA)** | — | Alternative speech provider behind the same interface; needs ULCA onboarding |

Full detail, including the guardrails, in [AI_STACK.md](./AI_STACK.md).

## 3. The deterministic kernel

No framework. Plain TypeScript, pure functions, no I/O — which is why it is testable and why every
figure is reproducible.

- Reducing-balance amortisation with quarterly rests and two moratorium conventions
- Rule-based scheme routing, cap-binding and dead-zone detection
- Exhaustive constrained enumeration for the multi-scheme capital stack
- Solvency: NABARD gestation joined to NSFDC repayment terms, RBI income gate, DSCR floor
- Market: two independent saturation estimators compared rather than averaged

## 4. Internationalisation

Two dictionaries, both hand-rolled, both three-language (English / Hindi / Hinglish):

- `src/lib/i18n/` — the **engine** dictionary. Messages are keys plus typed numeric slots, so a
  rupee figure is formatted once by `Intl` and injected as a slot; it is never translated.
- `src/lib/i18n-landing.ts` — chrome and marketing copy.

`next-intl` is installed but not used — the slot-based contract above is what protects numeric
fidelity, and it is 40 lines.

## 5. Channels

| Technology | Role |
|---|---|
| **Whapi** | WhatsApp gateway. Webhook secret is header-only and compared in constant time. |
| **Web Audio API + MediaRecorder** | Microphone capture; WAV is encoded by hand so one tested format leaves the client |
| **@react-google-maps/api** 2.20.8 | Installed; no map is rendered yet (see the ecosystem plan) |

## 6. Testing and tooling

| Technology | Version | Notes |
|---|---|---|
| **Vitest** | 5.0.0 | 137 tests across 9 files |
| **ESLint** | 9 + `eslint-config-next` | Clean |
| **tsx** | 4.23.13 | Runs the benchmark and the live voice check |
| **SIDDHI-Bench** | — | 500 seeded cases, ground truth computed by the kernel, `npm run bench` |

```
npm run dev          npm test           npm run bench
npm run build        npm run lint       npm run voice:check
```

## 7. Data sources

NABARD unit costs and gestation · NSFDC scheme terms · RBI Microfinance Directions 2022 ·
MoSPI HCES 2023-24 · Sixth Economic Census · MoSJE's NSFDC evaluation · SHRUG · LGD · WorldPop.
Full citations in [BIBLIOGRAPHY.md](./BIBLIOGRAPHY.md), provenance and confidence in
[../DATA_PROVENANCE.md](../DATA_PROVENANCE.md).

## 8. Deliberately not used

- **No database.** State is the persisted client store; the officer queue and gazetteer are
  in-repo modules. Nothing in the demo needs a server-side write.
- **No auth, no accounts.** Which is why the app never claims to know who you are.
- **No ORM, no backend framework.** Next route handlers are the entire server.
- **No training, fine-tuning, embeddings, vector store or RAG.**
- **No CSS-in-JS, no component library beyond shadcn/Base UI.**
- **No analytics or tracking.**
- `next-intl`, `@google-cloud/vertexai` and `@react-google-maps/api` are installed but not on any
  code path today. Listed here rather than on a slide.

## 9. Deployment

Vercel (Next.js). Secrets — `SARVAM_API_KEY`, `VERTEX_KEY_FILE`, `VERTEX_PROJECT_ID`,
`WHAPI_TOKEN`, `WHATSAPP_WEBHOOK_SECRET`, `APP_BASE_URL` — live in `.env.local` and `/secrets`,
both gitignored. Template in `.env.example`.
