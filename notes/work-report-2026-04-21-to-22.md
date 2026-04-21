## #Overview
Today I implemented a full **CRUD system** for the three core entities in the application:
- **Subjects**
- **Assignments**
- **Tasks**

This includes creating, editing, viewing details, and deleting records, as well as connecting all screens using Expo Router.

---

## #ImplementedFeatures

### #Subjects
Created full CRUD flow:
- `createSubject.tsx`
- `editSubject.tsx`
- `viewDetailsSubject.tsx`

**Functionality:**
- Create new subjects
- Edit existing subjects
- View subject details
- Delete subjects

**Relationships:**
- Subjects act as the top-level entity
- Assignments can optionally be linked to a subject via `sId`
- Subjects are displayed:
  - globally (`subjects.tsx`)
  - or standalone (`viewDetailsSubjects.tsx`)

---

### #Assignments
Created full CRUD flow:
- `createAssignment.tsx`
- `editAssignment.tsx`
- `viewDetailsAssignment.tsx`

**Functionality:**
- Create assignments (with optional `sId`)
- Edit assignments
- View assignment details
- Delete assignments

**Relationships:**
- Assignments can exist:
  - linked to a subject (`sId`)
  - or standalone (`sId = null`)
- Assignments are displayed:
  - globally (`assignments.tsx`)
  - or within a subject (`viewDetailsSubject.tsx`)
  - or standalone (`viewDetailsAssignment.tsx`)

---

### #Tasks
Created full CRUD flow:
- `createTask.tsx`
- `editTask.tsx`
- `viewDetailsTask.tsx`

**Functionality:**
- Create tasks
- Edit tasks
- View task details
- Delete tasks

**Relationships:**
- Tasks are linked to assignments via `aId`
- Tasks are accessed through assignment detail pages
- Assignments are displayed:
  - globally (`tasks.tsx`)
  - or within an assignment (`viewDetailsAssignment.tsx`)
  - or standalone (`viewDetailsTask.tsx`)

---

## #RoutingStructure

### #TopLevelScreens
- `subjects.tsx` → list of all subjects
- `assignments.tsx` → list of all assignments
- `tasks.tsx` → list of all tasks
- `index.tsx` → pre-existing home screen

---

## #DataModel

### #Subject
- `sId`
- `title`
- `description`
- `isActive`
- `lastChanged`
- `uId`

### #Assignment
- `aId`
- `title`
- `description`
- `deadline`
- `isCompleted`
- `lastChanged`
- `uId`
- `sId`

### #Task
- `tId`
- `title`
- `description`
- `isCompleted`
- `lastChanged`
- `uId`
- `aId`