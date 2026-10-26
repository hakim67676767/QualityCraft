# Pre-test / Post-test survey scoring specification

This document is the authoritative definition of how pre-test and post-test survey responses are scored, stored, and reported. It supersedes any earlier mixed-format description.

## 1. Goal

Both the pre-test and the post-test are recorded in a **single raw score format**. There is no longer a split where one phase stores a percentage and the other a raw value: every assessment writes exactly one `score`, and that score is the value shown and exported everywhere.

## 2. Reference authority

The scoring rule is defined by the live reference account `student.test1@qualitycraft.local` (`user_id = 25`), which uses the published **`understanding-v1` rating survey** for both phases:

- Pre-test instrument: `instrument_id = 1`, phase `pre`
- Post-test instrument: `instrument_id = 2`, phase `post`
- 10 rating statements, identical in both phases, each answered 1–5.

## 3. Score definition

### Rating survey (the current standard)

- A submission's **raw score = the mean of the 10 agreement ratings (1–5), rounded to 2 decimal places**:

  ```
  score = round( (Σ rating_i) / count , 2 )
  ```

- `rating_mean` is the same value, retained as the survey's own detail column.
- `correct_count` is `NULL` (there are no right/wrong answers).

Reference data: pre = `1.00` (ten ratings of 1), post = `5.00` (ten ratings of 5).

### Scored knowledge check (legacy / optional)

When a phase instrument is a scored type (multiple_choice / true_false / short_answer), the raw score is the **percentage (0–100, 2 decimal places)**:

```
score = round( correctAnswers / totalQuestions × 100 , 2 )
```

## 4. Storage

| Table | Column | Rating survey | Knowledge check |
| --- | --- | --- | --- |
| `survey_response` | `score` | mean rating (1–5) | percentage (0–100) |
| `survey_response` | `rating_mean` | mean rating (1–5) | `NULL` |
| `survey_response` | `ratings` | JSON snapshot | `NULL` |
| `assessment_attempt` | `score` | mean rating (1–5) | percentage (0–100) |
| `assessment_attempt` | `correct_count` | `NULL` | correct answers |
| `assessment_attempt` | `total_questions` | item count | item count |
| `assessment_attempt` | `rating_mean` / `ratings` | mean / JSON | `NULL` |

Both `score` columns are `DECIMAL(5,2) NULL` with `CHECK (score BETWEEN 0 AND 100)`. A 1–5 rating mean is within this range, so the constraint holds for both formats.

## 5. Calculation logic

- `backend/lib/understandingSurvey.js` — `summariseRatings()` computes the rating mean.
- `backend/lib/grading.js` — `gradeSubmission()` computes the knowledge percentage.
- `backend/services/assessmentService.js` — `submitAssessment()` selects the score by instrument type and writes it to both `survey_response.score` and `assessment_attempt.score`. The same `score` value is returned in the API response as `score` (rating responses also return `ratingMean` for continuity).

## 6. Reporting and display

- `backend/services/reportingService.js` — `preScore`/`postScore` now read the unified `score`; CSV and PDF render a single raw-score column, showing `x/5` for surveys and `x%` for scored checks (detected via `rating_mean` presence).
- `backend/services/researchService.js` — `summarizePairedRecords` computes `gain = post_score − pre_score` on the unified raw score; `summarizeUnderstanding` uses the `ratings` snapshots for per-statement means.
- `frontend/src/SurveyResults.jsx`, `PostTestView.jsx`, `StudentExperience.jsx`, `Monitoring.jsx` — display the raw score consistently, keyed off `rating_mean` presence to label the `1–5` scale versus `%`.

## 7. Change (gain) rule

- Per participant: `change = post_score − pre_score` (raw score points).
- For rating surveys this is the difference in mean agreement (max +4.00 for the reference account).
- A change is only computed when both phases are present and, for rating surveys, their statements match by `construct_key` and exact wording.

## 8. Invariants

1. Exactly one `score` is written per assessment; it is never `NULL` for a completed submission.
2. Pre and post use the identical scoring formula for the same instrument type.
3. `rating_mean` is written only for rating surveys; `correct_count` only for scored checks.
4. Reporting never converts a rating mean into a percentage, or vice versa.
