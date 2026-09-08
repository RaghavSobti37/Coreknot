# CoreKnot open-for-orgs — demo shot list + narration

**Output video:** `docs/marketing/demo-assets/coreknot-open-orgs-demo.mp4`  
**Storyboard HTML:** `docs/marketing/demo-assets/demo-storyboard.html`  
**Record script:** `docs/marketing/demo-assets/record-demo.mjs`

Target length: ~3:30. Pace: 8–12s per beat. Labels burn onto each slide.

| # | Timecode | Label on screen | What to show / say |
|---|----------|-----------------|--------------------|
| 1 | 0:00–0:12 | CoreKnot — open for every organization | Brand + one-liner: projects, CRM, attendance, ops — scoped to your org |
| 2 | 0:12–0:28 | Sign up free | Register / Clerk SignUp — no invite wall |
| 3 | 0:28–0:48 | Create your organization | `/org/create` wizard — name, slug, invites |
| 4 | 0:48–1:05 | Your data stays in your org | Isolation callout — API + DB tenant filters |
| 5 | 1:05–1:25 | Dashboard | Get-started checklist + mission overview |
| 6 | 1:25–1:45 | Projects & tasks | Project list → detail → task board |
| 7 | 1:45–2:05 | CRM leads | Leads pipeline — org-scoped |
| 8 | 2:05–2:20 | Attendance | Mark attendance / overview card |
| 9 | 2:20–2:40 | Finance (when unlocked) | Docs upload + approval trail |
| 10 | 2:40–2:55 | Switch or create orgs | Org switcher — create another workspace |
| 11 | 2:55–3:15 | Invite teammates | Settings → organization invites |
| 12 | 3:15–3:30 | Soft CTA | “Open CoreKnot for your team — your org only.” |

## Narration (English, founder tone)

> CoreKnot is open for every organization. Sign up, create your workspace, and you only ever see your own org’s data. Projects, CRM, attendance, finance — one ops stack, hard tenant boundaries. Invite your team when you’re ready. Build inside your org.

## Record locally

```bash
cd coreknot/Taskmaster
node docs/marketing/demo-assets/record-demo.mjs
```

Requires Playwright Chromium + ffmpeg on PATH.
