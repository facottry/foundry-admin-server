Feature: AI Jobs Orchestrator for Newsletters
Product Name (internal)

AI Jobs – Newsletter Automation

1. Problem Statement

Current “Auto-Pilot” is:

Global

Opaque

Not auditable

Not scalable beyond one workflow

Users cannot:

Create multiple AI workflows

Track what actually ran

Verify AI output per run

Separate generation vs sending

Debug failures

This limits trust and blocks scale.

2. Goal

Build a multi-job AI orchestration system where each job is:

Independently scheduled

Observable

Auditable

Editable

Reusable

Starting with Newsletter Jobs.

3. Non-Goals (important)

No A/B testing (yet)

No analytics like open/click rate

No branching workflows

No visual flow builder

No raw CRON exposure

4. Core Concepts
AI Job

A persistent definition of:

When to run

What AI tasks to execute

What to publish

Job Run

A single execution instance of a job.

5. Job Types (Phase 1)
Newsletter Job (only one for now)

Sequential steps:

Generate newsletter (AI)

Publish newsletter (email send)

6. User Flows
6.1 Create New Job

Inputs

Section A: Basics

Job Name (string, required)

Job Type (fixed: Newsletter)

Section B: Schedule

Frequency: Daily | Weekly

Time: HH:MM (12h/24h)

Day of week (weekly only)

Timezone (default account TZ, read-only)

Section C: Step 1 – Generate Newsletter

System Prompt / Topic (textarea)

AI Model (dropdown)

Max Items (number, optional)

Tone (optional future)

Section D: Step 2 – Publish Newsletter

Audience (All Subscribers)

Subject Template

Auto-send toggle (ON/OFF)

Actions

Save & Activate

Save as Draft

6.2 Jobs List View

Columns:

Job Name

Type

Schedule

Last Run

Status

Actions

Statuses:

Active

Paused

Failed

Partial (generated but not sent)

Actions:

View

Edit

Pause / Resume

Delete

6.3 Job Detail View
A. Overview

Job Name

Status

Schedule

Next Run

Last Successful Run

B. Execution History (critical)

Table per run:

Run Time

Generated (Yes/View)

Sent (Yes/No)

Recipient Count

Result

Clicking View shows:

Generated newsletter content

Model used

Generation timestamp

C. Summary

Total runs

Success rate

Avg recipients per run

7. Data Model (Mongo – simplified)
ai_jobs
{
  "_id": "job_id",
  "name": "Daily Product Digest",
  "type": "newsletter",
  "schedule": {
    "frequency": "daily",
    "time": "09:00",
    "day": null,
    "timezone": "Asia/Kolkata"
  },
  "tasks": {
    "generate": {
      "prompt": "Daily product discovery tips & trends",
      "model": "gemini-1.5-flash"
    },
    "publish": {
      "enabled": true,
      "audience": "all",
      "subject": "Today's Product Discoveries"
    }
  },
  "status": "active",
  "createdAt": "...",
  "updatedAt": "..."
}

ai_job_runs
{
  "_id": "run_id",
  "jobId": "job_id",
  "runAt": "...",
  "generated": true,
  "contentRef": "newsletter_id",
  "sent": true,
  "recipients": 1248,
  "status": "success",
  "error": null
}

8. Success Criteria

User can manage multiple newsletter jobs

Every run is verifiable

Failures are visible

Daily + weekly newsletters coexist cleanly

No global coupling