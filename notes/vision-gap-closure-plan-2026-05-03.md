# Study Sprint Project Vision Gap Closure Plan

## #Overview
This document turns the remaining gaps between the current app and the project vision into a concrete implementation plan.

Each section below covers one gap between the current version of Study Sprint and the product vision described in `notes/projectVision/AppDev_Project_Vision.pdf`.

The goal is not to expand the app into a large productivity platform. The goal is to close the remaining vision gaps while keeping the product small, student-focused, and realistic to complete.

The app direction assumes the current backend-based architecture remains in place. The report can explain that the project moved from a local-storage-first idea to a database-backed model because authentication and cross-device persistence would otherwise provide little practical value.

This note has been updated after the main May 3 and May 4 timer, dashboard, setup, and progress work. That means the earlier gaps around dashboard progress, recent session history, consistent progress labels, and most of the main sprint-start friction are no longer the main blockers.

What remains now is smaller, but more important:
- finishing the last missing part of the focus-and-break loop
- making session lifecycle behavior fully consistent
- tightening first-time routing so incomplete users are guided automatically
- making sure the final app behavior and final report tell the same story

---

## #Gap1FocusSessionsAndBreaks

### #VisionGap
The vision describes a study app built around focus sessions and breaks.

The current app now supports task-linked focus sessions, short breaks, and post-session choices.

The main missing piece is that the break flow still stops short of a simple complete cycle rule.

### #WhyThisMatters
The app is much closer to the promised study pattern than before, but it still does not fully behave like a complete focus-and-break system if every finished focus session only leads to the same short-break path.

### #Plan
1. Keep the existing lightweight session model that distinguishes between `focus`, `short_break`, and `long_break`.
2. Keep task linkage only on `focus` sessions so break sessions remain simple.
3. Preserve the current post-focus action path:
   - `Start short break`
   - continue same task
   - back to dashboard
4. Preserve the current post-break action path:
   - continue with same task
   - back to dashboard
5. Add the missing simple cycle rule:
   - after a chosen number of completed focus sessions, offer `long_break` instead of `short_break`
6. Keep the implementation intentionally small:
   - fixed default durations are enough
   - no need for advanced timer customization to satisfy the vision

### #DoneWhen
- The app supports a full `focus -> short break -> continue` flow.
- The app also supports a simple `long_break` cycle so break behavior feels intentional rather than incomplete.
- Breaks are treated as real app states, not just something the user has to manage manually.
- The timer flow fully matches the vision wording about focus sessions and breaks.

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

The current app already has onboarding copy, guided setup, and clearer empty states.

The remaining issue is that setup guidance is still too easy to bypass after login.

### #WhyThisMatters
The app can still meet the low-friction goal even with auth, but only if incomplete users are routed toward the next meaningful action automatically instead of being left to discover setup on their own.

### #Plan
1. Keep the current login and signup explanation copy about what the app does and why the account exists.
2. Keep the guided setup flow as the main onboarding structure:
   - create first subject
   - create first assignment
   - create first task
   - start first sprint
3. Add routing logic so users who still have no real study structure, or who have not completed the first sprint, are sent into setup automatically after login when appropriate.
4. Keep the dashboard empty state, but do not rely on it as the only onboarding recovery path.
5. Re-check that setup completion is based on a real first-use milestone:
   - not just account creation
   - but reaching the first meaningful study action

### #DoneWhen
- A new user can reach their first sprint with minimal confusion.
- An incomplete user is guided back into setup instead of being dropped into a less helpful dashboard state.
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
Most of the steps above have been completed#####################
#################################################################
#################################################################


## #Gap6ReliabilityAndSessionState

### #VisionGap
The vision identifies reliability as critical.

The app already has a stronger session model than before, but reliability work is now the most important remaining gap.

The biggest issue is not the presence of session data, but making sure every path updates both persisted active-session state and recorded session history consistently.

### #WhyThisMatters
If the timer or sprint state feels inconsistent, the app loses trust very quickly, especially now that the app already exposes session history and progress metrics on the dashboard.

### #Plan
1. Review the full session lifecycle and make sure every session ends in a valid final state:
   - `completed`
   - `cancelled`
   - `expired`
   - break sessions included
2. Remove remaining places where the app only clears local active-session storage without also correctly finalizing the underlying recorded session.
3. Make sure dashboard history, task totals, and active session state all reflect the same underlying session truth.
4. Confirm that reopening the app after a session should have ended produces the correct finalization behavior.
5. Confirm that replaced or interrupted sessions are explicitly treated as cancelled rather than silently disappearing.
6. Confirm that cancelled sessions do not accidentally remain active in local resume storage.
7. Test the edge cases around:
   - app backgrounding
   - app reopen
   - expired session reopen
   - replacing one active session with another
   - switching between timer and dashboard
8. Document any remaining non-ideal behavior clearly if platform limitations prevent a perfect solution.

### #DoneWhen
- Session state transitions are predictable.
- History, task totals, and active session status stay in sync.
- Replaced or interrupted sessions are not lost or misrepresented.
- The timer feels dependable enough to support the vision's reliability requirement.

---

## #Gap7ScopeDisciplineAndVisionAlignment

### #VisionGap
The vision values a realistic scope and a smaller polished product over a larger unfinished one.

To stay aligned with that, the remaining work needs to focus only on the features that directly close the vision gaps.

### #WhyThisMatters
The fastest way to miss the vision now is to expand sideways into extra features instead of finishing the core loop properly and then leaving the report out of sync with the implemented product.

### #Plan
1. Treat these as the remaining priority set:
   - final focus/break cycle completion
   - session lifecycle consistency
   - setup-routing polish for incomplete users
   - reliability and session-state cleanup
   - final vision/report alignment
2. Explicitly avoid adding large optional features during this phase, such as:
   - social login
   - advanced analytics
   - calendar systems
   - collaboration tools
   - broad gamification
3. Update the report wording so the architectural shift to DB/auth is explained as a pragmatic decision, not as a contradiction left unresolved.
4. Re-check the final app against the vision using product outcomes rather than older implementation assumptions like strictly local persistence.
5. Make sure the report does not describe older gaps as if they are still unresolved:
   - dashboard progress visibility
   - recent session history
   - progress meaning across screens
   - basic focus-to-break flow

### #DoneWhen
- The team is working only on features that directly close vision gaps.
- The report and the final app tell the same story.
- The product remains small, focused, and polished enough for the project scope.

---

## #SuggestedImplementationOrder
1. Finish the remaining focus/break cycle logic by adding the simple `long_break` offer.
2. Fix the remaining session-lifecycle inconsistencies so replacing, expiring, cancelling, and resuming sessions all update the same underlying truth.
3. Tighten onboarding routing so incomplete users are guided into setup automatically after login when needed.
4. Run reliability testing across active, cancelled, expired, replaced, break, and restored session paths.
5. Update the report so the DB/auth decision, the now-completed vision gaps, and the final remaining scope are described accurately.

---

## #FinalGoal
When this plan is complete, Study Sprint should feel like a finished small study app rather than a partly connected prototype.

A user should be able to:
- sign in and understand the app quickly
- create a simple study structure without confusion
- start a focus session tied to a task
- continue naturally into a break
- move through a simple and intentional break cycle
- return and continue studying
- see visible proof of progress on the dashboard
- trust that session history and active-session state reflect the same reality

That is the point where the current app most clearly matches the project vision.
