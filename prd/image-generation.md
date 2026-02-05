PRD — Image Generation Pipeline (Client-Driven, 2-Step)
1. Objective

Build a client-controlled image generation pipeline inside the Admin Server that allows users to:

Provide Intent + Prompt

Review and edit the final AI-enhanced prompt

Start an async image generation job

Track job status and history

Receive CDN URLs only for generated images

The system must be deterministic, auditable, cost-controlled, and modular.

2. Non-Goals (Explicit)

No server-side hidden prompt mutation after user approval

No blocking image generation in HTTP request

No binary/image storage in MongoDB

No more than 5 images per job

No exposure of local filesystem paths to client

3. User Inputs (Locked)
Required (Client)

intent (string)

prompt (string)

Optional / Controlled

imageCount (number, hard-clamped to max 5)

No other user inputs allowed in v1.

4. User Flow (Client Perspective)
Step 1 — Prompt Preparation

User enters:

Intent

Prompt

Client calls /image/enhance-prompt

Server returns finalPrompt

Client displays finalPrompt in editable textarea

No cost-incurring operation happens in this step.

Step 2 — Execute Job

User edits and confirms finalPrompt

User selects image count (1–5)

Client calls /image/execute-prompt

Server returns jobId

Client navigates to Jobs screen

Step 3 — Monitor & Consume

Client polls:

/image/job-status/:jobId

/image/job-list

On completion:

User sees thumbnails

User copies CDN URLs

5. API Surface (Strict)

All routes live under /image/*
All code lives under /imagegeneration/*

5.1 Enhance Prompt

POST /image/enhance-prompt

Input

{
  "intent": "homepage category card",
  "prompt": "simple saas ui"
}


Output

{
  "finalPrompt": "High-fidelity modern SaaS homepage category card UI..."
}


Rules:

Text-only AI

No DB writes

Fast (<2s)

5.2 Execute Prompt (Create Job)

POST /image/execute-prompt

Input

{
  "intent": "homepage category card",
  "rawPrompt": "simple saas ui",
  "finalPrompt": "High-fidelity modern SaaS homepage category card UI...",
  "imageCount": 3
}


Rules:

Clamp imageCount to 1–5

Create Mongo job

Status = QUEUED

Return immediately

Output

{
  "jobId": "imgjob_xxx",
  "status": "QUEUED"
}

5.3 Job Status

GET /image/job-status/:jobId

Output

{
  "jobId": "imgjob_xxx",
  "status": "DONE",
  "cdnUrls": [
    "https://cdn.domain.com/asset1.png"
  ]
}

5.4 Job List

GET /image/job-list

Output

[
  {
    "jobId": "imgjob_xxx",
    "intent": "homepage category card",
    "status": "DONE",
    "cdnUrls": [...]
  }
]

6. Data Model (MongoDB — Strings Only)
ImageJob {
  _id: ObjectId,
  intent: String,
  rawPrompt: String,
  finalPrompt: String,
  imageCount: Number,
  status: "QUEUED" | "RUNNING" | "DONE" | "FAILED",
  cdnUrls: [String],
  error: String,
  createdAt: Date,
  updatedAt: Date
}


Constraints:

No buffers

No local paths

CDN URLs only

7. Worker Behavior

Runs asynchronously (interval / cron / queue)

Picks QUEUED jobs

Marks RUNNING

For each image:

Generate image (OpenAI)

Upload to CDN (R2)

Collect CDN URL

On success → DONE

On failure → FAILED with error string

Retry = re-queue job.

8. Quality & Cost Controls

Prompt enhancement is user-visible

No hidden transformations after approval

Max 5 images per job

Image generation only starts after explicit user action

CDN URLs are immutable outputs

9. Folder Isolation (Non-Negotiable)
appserver/imagegeneration/


No leakage into other modules.

10. Success Criteria

User can predict output before spend

Jobs are auditable and replayable

No surprise costs

CDN URLs usable immediately in frontend

Easy to extend (presets, retries, regen)