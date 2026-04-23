# Progress Tracking (Assignments & Subjects)

## What was done
- Implemented progress tracking for both assignments and subjects
- Used `Task.isCompleted` as the source of truth
- Synced `Assignment.isCompleted` based on task completion

## Logic implemented
- Created `CheckAssignmentCompletion(aId)`
- Assignment is marked completed only if all its tasks are completed
- Assignment remains incomplete if:
  - Any task is incomplete
  - No tasks exist

## Data handling
- Fetched assignments from Supabase
- Fetched all related tasks using assignment IDs
- Grouped tasks by `aId` into `tasksByAssignment`
- Used grouped data to calculate progress efficiently

## Progress calculation
- Assignment progress:
  - completed tasks / total tasks
- Subject progress:
  - completed tasks across all assignments / total tasks

## UI work
- Added progress bars to:
  - Assignment cards
  - Subject views
- Used basic inline styling for progress bars
- Fixed layout issues caused by incorrect placement inside `flex-row`
- Moved progress bar into content column to prevent UI breaking

## Result
- Progress updates dynamically based on task completion
- Assignment completion stays in sync with tasks
- UI correctly displays both assignment and subject progress