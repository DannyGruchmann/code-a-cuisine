<claude-mem-context>
# Memory Context

# [code-a-cuisine] recent context, 2026-05-28 5:10pm GMT+2

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 22 obs (8,438t read) | 472,195t work | 98% savings

### May 28, 2026
811 2:20p ✅ code-a-cuisine project cleanup: removed junk files and committed
812 " 🔵 GitHub remote URL outdated — repo migrated from JustDannyG to DannyGruchmann
813 " 🔵 Cloudflare Pages deployment live and responding — no wrangler.toml in repo
814 " 🔵 tsconfig.json uses deprecated `moduleResolution: "node"` causing VS Code red highlight
824 3:22p 🔴 TypeScript Node.js Type Errors Fixed in code-a-cuisine
825 " 🔵 n8n Webhook "All Requests Used" Error Is a Misleading Fetch Failure Fallback
832 " 🔵 Live Bundle Uses Stale n8n Webhook URL Causing TLS Certificate Failure
815 4:39p 🔵 code-a-cuisine server.ts has 4 TypeScript errors — Node.js type definitions not resolving
816 4:42p 🔵 server.ts root cause confirmed: ESM node: protocol + import.meta.url incompatible with moduleResolution "node"
817 4:45p 🔴 Fixed TypeScript errors in code-a-cuisine: tsconfig.app.json + server.ts patched
818 " 🔵 NodeNext moduleResolution in tsconfig.app.json broke all Angular source files — wrong fix approach
819 " 🔴 code-a-cuisine TypeScript errors fully resolved — tsc now exits clean (code 0)
820 4:46p 🔵 code-a-cuisine quota error message hardcoded in 5 places across recipe-request service
821 " 🔵 code-a-cuisine architecture: n8n webhook + Firestore polling for async recipe generation
822 4:47p 🔵 n8n cloud webhook URL unreachable — DNS resolution fails for dglabs.app.n8n.cloud
823 " 🔵 n8n webhook IS reachable and returns HTTP 200 — previous DNS failure was a sandbox permission issue
826 " 🔵 n8n webhook CORS is correctly configured for the Cloudflare Pages deployment domain
827 " 🔵 Live Cloudflare Pages deployment serves old pre-tsconfig-fix build — new changes not yet deployed
828 4:57p 🔵 tsconfig.json Red Highlight Persists After Previous Fix Attempt
829 4:58p 🔵 code-a-cuisine TypeScript Compilation Is Clean Despite VS Code Red Highlight
830 5:04p 🔵 n8n Self-Hosted Webhook Fails with ERR_CERT_AUTHORITY_INVALID
831 " 🔵 n8n Hostinger VPS Has Self-Signed/Invalid SSL Certificate

Access 472k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>