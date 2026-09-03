# Personal AI Job Search

Public JobSearch now has an isolated AI tab, with Browse jobs remaining the default. No catalogue, HR ingestion, subscription, or checkout code is changed. This is not the fictional local prototype: results will come from authenticated server-side web search.

Activation is intentionally closed pending the separately requested OpenAI project credential, selected model, plan allowances, and a global daily request ceiling. Add `PERSONAL_JOB_SEARCH_OPENAI_API_KEY` and `PERSONAL_JOB_SEARCH_MODEL` as Supabase secrets; never reuse/fall back to the HR key. Set the private `ai_job_search_settings` plan allowances and request ceiling before enabling. No example allowance is sold or silently granted.

The server ledger reserves included monthly credits first, then extra credits. Calendar month uses Asia/Baku. Failed/abandoned reservations stop consuming credits; failed attempts still count against the daily provider-call ceiling. A request UUID deduplicates successful retries. Only server role can invoke the ledger. Extra grants require unique verified payment references and must only be issued by a future verified-payment integration. Existing checkout is not open, so packages remain unavailable, without a pretend purchase button.

Each request is independent: users should include all desired criteria. Responses use web search with at most two tool calls, 1,800 output tokens, and a 55-second timeout. Results are plain text with safe HTTPS citation links. No profile/CV data is automatically supplied. Actual per-search cost still needs measurement after activation; a request ceiling is not an exact dollar cap.

Rollback: remove the personal-job-search script/style includes to hide the UI; set private.ai_job_search_settings.enabled=false to close API calls. Preserve ledger rows for audit. Reverting this feature does not require reverting other working-tree changes.
