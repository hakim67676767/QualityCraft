# Software-testing understanding surveys

On 16 October 2026 the requested pre-test/post-test format changed to **survey ratings only**. New default instruments use version `understanding-v1` and the same ten statements before and after learning.

Students select one response per statement:

1. Strongly disagree
2. Disagree
3. Neither agree nor disagree
4. Agree
5. Strongly agree

There are no correct answers, pass marks, or percentage scores. These responses measure **self-reported understanding**; they do not measure objective knowledge or establish that learning caused a change. This replaces the report's proposed multiple-choice knowledge measure for these surveys. Lesson quizzes still assess knowledge, and the existing post-course suitability questionnaire remains separate.

## Matching statements

| Concept key | Statement in both surveys |
| --- | --- |
| testing_purpose | I understand the purpose of software testing. |
| qa_and_testing | I can explain the difference between quality assurance and software testing. |
| testing_limits | I understand why testing cannot prove that software has no defects. |
| test_case | I can identify the input, steps, and expected result in a test case. |
| expected_actual | I can compare expected and actual results to recognise a software defect. |
| bug_report | I can describe a software defect using clear steps to reproduce it. |
| defect_severity | I understand how the severity of a defect describes its impact. |
| testing_types | I can explain the difference between unit testing and regression testing. |
| test_inputs | I can choose boundary values and invalid inputs to test a feature. |
| quality_improvement | I can use test results to suggest a practical quality improvement. |

## Stored data and reports

Each response saves its item ID, concept key, exact statement, and selected rating as a snapshot, together with the average agreement rating. For a rating survey the raw score is the **mean agreement rating (1–5)**, which is recorded in `survey_response.score` and the attempt's `score` column so that pre-test and post-test share a single, consistent score field; `correct_count` remains NULL and `rating_mean`/`ratings` retain the survey detail. For a scored knowledge check the `score` is the percentage (0–100). Existing scored responses and their instrument versions remain intact.

The student completes the pre-survey before lessons and the post-survey after completing all modules. Completion still uses the existing server-enforced gates and one-original-response-per-phase rule. Existing accounts retain their original response and can answer the current rating survey again through **Survey Results → Retake pre-test survey / Retake post-test survey**.

Retakes are additional responses stored in `assessment_attempt`, with their ratings, instrument version, timestamp, and `is_retake` flag. They do not replace the original `survey_response`, reset progress, or award extra XP. Students can cancel without saving and can review saved retakes in their history. A pre-test retaken after learning is not a new baseline: the study comparison continues to use original submissions. The research CSV includes `survey_retake_responses` separately. Students whose original answers used the older scored format can also retake the current ratings.

Each retake form is signed for its student, phase, version, and most recent attempt. A user-row lock and revision check reject duplicate or stale submissions, including simultaneous submissions from two tabs. Starting another retake explicitly loads a fresh form. Class membership, research-authorisation, and post-test completion prerequisites still apply.

Student results show before/after means out of 5. Teacher monitoring and CSV/PDF reports display the raw score (a 1–5 mean for rating surveys, or a percentage for scored checks) in a single, consistent field. Administrator Research & Evidence shows matched authorised pairs and per-statement before/after means and changes. Comparisons require the same concept keys and exact statements in both surveys, regardless of statement order. Missing, withdrawn, invalid, and incompatible pairs cannot enter the paired averages. The raw responses and instrument versions remain in the anonymised export for analysis.

Research CSV retains the legacy score columns and adds explicit understanding columns: `pre_understanding_mean_1_to_5`, `post_understanding_mean_1_to_5`, `understanding_change`, `understanding_paired`, and both response snapshots. Exported means and changes use matched pairs. No student names or email addresses are added.

Administrators can copy a published instrument to a new version. Choose **Survey rating (1–5)**, keep each concept key unique, and use the same statement/key in both phases. Rating statements cannot be mixed with scored questions in one instrument. Published and used instruments remain immutable.

`npm run migrate` adds the rating fields and nullable score support idempotently. It creates these defaults only if a phase has no published instrument and the default version has never been created. It does not replace administrator-authored published instruments or republish a deliberately retired default.

## Verification

Backend unit and MySQL regression tests cover raw rating persistence, NULL scores, invalid/missing responses, phase binding, duplicates, completion gates, matching statements, reports, withdrawal, exports, historical scored assessments, and database recovery. Frontend build and lint pass.

A fresh real Chrome/Express/MySQL browser run completed both surveys and all five learning modules. It verified required answers, keyboard rating selection, reload protection after submission, the student comparison, teacher ratings, administrator item analysis, and CSV download. Survey layouts were checked at 1440, 1024, and 768 pixels. No uncaught JavaScript errors were observed in that run.

- [Pre-survey](../design-review/playwright/25-pre-survey-1440.png)
- [Post-survey](../design-review/playwright/26-post-survey.png)
- [Student comparison](../design-review/playwright/27-student-survey-comparison.png)
- [Teacher report](../design-review/playwright/28-teacher-survey-results.png)
- [Administrator analysis](../design-review/playwright/29-admin-survey-comparison.png)

To repeat, start a fresh [temporary browser QA installation](playwright-browser-verification.md), open the named browser, and run only `playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-understanding-survey-qa.js`. This scenario creates its own temporary accounts and uses the default published surveys. The older browser sequence explicitly tests compatibility with administrator-published knowledge instruments.

Then run `playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-survey-retakes-qa.js` to verify cancellation, both retakes, preserved original comparisons and XP, saved history after reload, and desktop/tablet layouts. Database regression also verifies a retake by a student with an earlier scored submission and simultaneous duplicate protection.

The retake browser scenario passed on 17 October 2026 at 1440, 1024, and 768 pixels with no uncaught JavaScript errors. Cancellation, both phase retakes, separate history, preserved originals and XP, and reload persistence were verified. Decimal rating values are formatted consistently in the history. Existing students can use the feature without creating another account.

- [Retake controls and saved history](../design-review/playwright/30-survey-retakes-1440.png)
