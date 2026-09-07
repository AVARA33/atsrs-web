# HR balance timeout fix — 7 September 2026

At 11:30 Baku the queue had 45,019 pending records. Of 31 runs since 09:00, 25 failed with PostgreSQL cancellation code `57014`; five partial runs published 61 jobs. All 243 enabled sources had been checked, with 110 reporting source-specific errors. The primary throughput fault was therefore the balance selector, not lack of candidates.

The former selector repeatedly scanned and sorted the full pending queue for every AI call. Migrations `20260907073127_optimize_hr_balance_queue.sql` and `20260907073356_index_hr_balance_candidates.sql` now reduce selection to one indexed candidate per specialty while retaining least-published-specialty ordering and attempted-specialty rotation. The candidate index also orders official source dates without treating them as validation; runtime still rejects future, missing, or older-than-14-day dates.

Measured selector execution fell from 10.15 seconds before the candidate index to 3.97 seconds on its first cold read and 63.7 milliseconds on the next read. Real production run `b7333228-f2a1-4ffc-9c05-801829bfda80` then completed without error: 34 discovered, 15 published, 4 updated, 1 archived, 7 review, and all 20 AI calls settled. Its dispatch returned HTTP 200.

The 44,880 pending rows were then profiled: 33,746 had an explicit date older than the 14-day publication policy; 9,439 were recent; and 1,695 needed detail-page date resolution. Migration `20260907081556_quarantine_stale_hr_candidates.sql` moved the explicitly stale, never-published rows to review. Edge version 11 now places newly discovered listings with an explicit stale/future date directly in review, preventing the backlog from recurring. Pending fell to 11,147 (9,420 recent, 1,694 date-less, and 33 previously linked updates).

Post-cleanup production run `cb295ded-81c4-414e-bc12-a107044b66fa` returned HTTP 200 and completed in 70 seconds: 29 discovered, 18 published, 1 updated, and 6 review. This confirms queue processing remained operational after the bulk classification and v11 deployment.
