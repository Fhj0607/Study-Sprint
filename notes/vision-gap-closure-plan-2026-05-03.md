# Study Sprint Project Vision Gap Closure Plan

## #Overview
This document turns the remaining gaps between the current app and the project vision into a concrete implementation plan.

Each section below covers one gap between the current version of Study Sprint and the product vision described in `notes/projectVision/AppDev_Project_Vision.pdf`.

The goal is not to expand the app into a large productivity platform. The goal is to close the remaining vision gaps while keeping the product small, student-focused, and realistic to complete.

The app direction assumes the current backend-based architecture remains in place. The report can explain that the project moved from a local-storage-first idea to a database-backed model because authentication and cross-device persistence would otherwise provide little practical value.

---

## #Gap1FocusSessionsAndBreaks

### #VisionGap
The vision describes a study app built around focus sessions and breaks.

The current app supports task-linked focus sprints, but it does not yet complete the full study loop with a real break flow.

### #WhyThisMatters
Without break handling, the timer is only a session starter and stopper.

That means the app is missing part of the core study pattern the vision promises.

### #Plan
1. Add a lightweight session model that distinguishes between `focus`, `short break`, and `long break`.
2. Keep task linkage only on `focus` sessions so break sessions stay simple.
3. After a completed focus sprint, show a post-session choice screen with:
   - `Start short break`
   - `Skip break`
4. After a completed short break, show:
   - `Continue with same task`
   - `Back to dashboard`
5. Add a simple cycle rule:
   - after a chosen number of completed focus sessions, offer `long break` instead of `short break`
6. Keep the first implementation minimal by using fixed default durations before considering user customization.

### #DoneWhen
- The app supports a full `focus -> break -> continue` flow.
- Breaks are treated as real app states, not just something the user has to manage manually.
- The timer flow now matches the vision wording about focus sessions and breaks.

---

## #Gap2DashboardProgressAndHistory

### #VisionGap
The vision says the app should make progress visible through completed sessions, study time, or simple statistics.

The current app already shows active sprint state, upcoming deadline tasks, and task time data, but the dashboard still needs to work more clearly as a progress overview.

### #WhyThisMatters
The app should answer the question: `Am I actually making progress?`

If that answer is not obvious from the dashboard, the motivational part of the vision is only partially fulfilled.

### #Plan
1. Add a compact dashboard progress summary near the top of the screen.
2. Show at least these values:
   - `Focus sessions completed today`
   - `Minutes studied today`
   - `Minutes studied this week`
3. Add a `Recent sessions` section below the summary.
4. Show for each recent session:
   - task title if present
   - session type
   - duration
   - completed or cancelled state
   - time or date
5. If there is room and it stays visually simple, add a small `Recently completed tasks` section after recent sessions.
6. Keep the dashboard layout compact so it still feels like a low-friction home screen rather than a report page.

### #DoneWhen
- The dashboard gives immediate visibility into recent study effort.
- Session history is visible without needing a dedicated analytics screen.
- Progress feels tied to real study behavior, not only to planning structure.

---

## #Gap3ConsistentProgressModel

### #VisionGap
The vision expects progress to feel simple and understandable.

Right now, progress exists in multiple places, but it should be made more consistent so the user can understand what each screen is measuring.

### #WhyThisMatters
If `progress` means one thing on one screen and something unrelated on another, the app feels less clear and less intentional.

### #Plan
1. Define one clear meaning of progress per layer:
   - `Subject`: completed assignments out of total assignments
   - `Assignment`: completed tasks out of total tasks
   - `Task`: total study time plus completed focus sessions
   - `Dashboard`: today's and this week's study activity
2. Review the labels on each screen so they match those meanings exactly.
3. Make sure no screen mixes planning progress and session progress without clearly separating them.
4. Re-check the database queries and UI labels so each metric comes from the right source of truth.
5. If needed, add small helper text where a metric could otherwise be ambiguous.

### #DoneWhen
- Each screen communicates one clear type of progress.
- The app feels easier to understand from first use.
- Progress presentation supports the vision goal of simplicity.

---

## #Gap4FirstTimeUserFriction

### #VisionGap
The vision emphasizes low friction and ease of use from the first launch.

The current app uses authentication and a structured hierarchy, which is reasonable for the chosen architecture, but it still needs a smoother first-run experience.

### #WhyThisMatters
The app can still meet the low-friction goal even with auth, but only if the user is guided quickly into the first meaningful action.

### #Plan
1. Add a short explanation on the login or signup flow that says:
   - what the app does
   - why an account exists
   - that progress follows the user
2. After the first successful signup, route the user into a guided setup flow instead of a generic empty dashboard.
3. Build the setup flow as a strict sequence:
   - create first subject
   - create first assignment
   - create first task
   - start first sprint
4. Add clear empty states on key screens so each one gives only one obvious next action.
5. Use prefilled examples or short placeholder hints where that reduces thinking for the user.
6. Avoid giving the user too many choices before they have created their first workable study path.

### #DoneWhen
- A new user can reach their first sprint with minimal confusion.
- The app no longer feels empty or directionless after authentication.
- The structured hierarchy feels guided instead of heavy.

---

## #Gap5MainFlowFriction

### #VisionGap
The vision promises a fast and focused experience that reduces procrastination rather than adding more friction.

The current app already has the right hierarchy, but the main flow should be tightened so starting real work feels faster.

### #WhyThisMatters
Even a good feature set can feel wrong if the path to action is too slow or too fragmented.

### #Plan
1. Make `Start Sprint` the strongest action on task-level screens.
2. Use a sensible default sprint duration so the user can begin immediately without extra setup.
3. Review the number of taps from dashboard to active study session and remove unnecessary detours.
4. Ensure that post-sprint actions are explicit and simple:
   - start break
   - continue same task
   - return to dashboard
5. Keep the dashboard focused on next actions rather than loading it with too many management controls.
6. Re-check labels, button wording, and action order so the app always pushes the user toward concrete study work.

### #DoneWhen
- Starting a study sprint feels fast.
- The app consistently guides the user toward focused work.
- The product behavior matches the vision goal of low-friction use.

---


#################################################################
#################################################################
The steps above have been completed##############################
#################################################################
#################################################################


## #Gap6ReliabilityAndSessionState

### #VisionGap
The vision identifies reliability as critical.

The app already has a stronger session model than before, but reliability work should explicitly close the loop for running, finishing, cancelling, resuming, and displaying sessions.

### #WhyThisMatters
If the timer or sprint state feels inconsistent, the app loses trust very quickly.

### #Plan
1. Review the full sprint lifecycle and make sure every session ends in a valid final state:
   - `completed`
   - `cancelled`
   - `expired`
   - break equivalents if breaks are added
2. Make sure dashboard history, task totals, and active sprint state all reflect the same underlying session truth.
3. Confirm that reopening the app after a session should have ended produces the correct finalization behavior.
4. Confirm that cancelled sessions do not accidentally remain active in local resume storage.
5. Test the edge cases around:
   - app backgrounding
   - app reopen
   - expired sprint reopen
   - switching between timer and dashboard
6. Document any remaining non-ideal behavior clearly if platform limitations prevent a perfect solution.

### #DoneWhen
- Session state transitions are predictable.
- History, task totals, and active sprint status stay in sync.
- The timer feels dependable enough to support the vision's reliability requirement.

---

## #Gap7ScopeDisciplineAndVisionAlignment

### #VisionGap
The vision values a realistic scope and a smaller polished product over a larger unfinished one.

To stay aligned with that, the remaining work needs to focus only on the features that directly close the vision gaps.

### #WhyThisMatters
The fastest way to miss the vision now is to expand sideways into extra features instead of finishing the core loop properly.

### #Plan
1. Treat these as the remaining priority set:
   - focus and break flow
   - dashboard progress summary
   - session history visibility
   - onboarding and empty-state friction reduction
   - reliability and session-state cleanup
2. Explicitly avoid adding large optional features during this phase, such as:
   - social login
   - advanced analytics
   - calendar systems
   - collaboration tools
   - broad gamification
3. Update the report wording so the architectural shift to DB/auth is explained as a pragmatic decision, not as a contradiction left unresolved.
4. Re-check the final app against the vision using product outcomes rather than older implementation assumptions like strictly local persistence.

### #DoneWhen
- The team is working only on features that directly close vision gaps.
- The report and the final app tell the same story.
- The product remains small, focused, and polished enough for the project scope.

---

## #SuggestedImplementationOrder
1. Implement the focus and break session flow.
2. Add dashboard progress summary and recent session history.
3. Make progress definitions consistent across subject, assignment, task, and dashboard screens.
4. Build the first-time setup flow and improve empty states.
5. Tighten the main sprint-start flow and post-session actions.
6. Run reliability testing across active sprint, cancelled sprint, expired sprint, and restored sprint paths.
7. Update the report so the DB/auth decision and final scope are explained clearly.

---

## #FinalGoal
When this plan is complete, Study Sprint should feel like a finished small study app rather than a partly connected prototype.

A user should be able to:
- sign in and understand the app quickly
- create a simple study structure without confusion
- start a focus session tied to a task
- continue naturally into a break
- return and continue studying
- see visible proof of progress on the dashboard

That is the point where the current app most clearly matches the project vision.
