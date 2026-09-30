---
version: 1
slug: "src-app-voice-transaction-tsx"
primary_target: "src/app/voice-transaction.tsx"
related_targets: ["src/components/voice-transaction-screen.native.tsx","src/components/voice-transaction-screen.tsx"]
---

# Voice transaction

Scope: native `voice-transaction` capture and review flow. Visitor mode: Operate.

Audience: an existing Cash IO user recording one everyday transaction. Job: create a trustworthy editable draft faster than typing. Primary task: record, stop, inspect, correct, and explicitly save. Constraints: iOS and Android only, local inference, no automatic write, 30-second limit, manual entry always available.

## Direction contract

THESIS: Voice is a temporary input instrument, not a chatbot. The flow refuses a conversational transcript and keeps the financial form as the authority.

OWN-WORLD: Inherit Cash IO's neutral tonal surfaces, orange primary action, compact system type, tabular timing, 16px panels, and platform-sized controls. Recording state uses explicit text, timer, icon, and shape rather than color alone.

STORY: The user sees the local-processing promise, prepares the pinned model if needed, records one statement, waits through a clearly bounded local operation, then receives the familiar editor with unresolved fields left visibly unselected.

FIRST VIEWPORT: A standard back/title row leads into one quiet recording panel. Status and concise guidance occupy the upper half; one large record/stop control anchors the reachable lower area. Download and manual-entry actions replace it when required.

FORM: Established-surface extension, first and only structure considered because `VOICE_TRANSACTIONS.md` specifies the state sequence and the existing editor owns review. Seed key: incumbent-voice-extension.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Unresolved: physical-device RAM, thermal, latency, offline, interruption, and network-isolation gates remain release blockers until measured.
