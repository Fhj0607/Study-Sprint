# CRUD Testing Summary (React Native + Jest + Supabase)

## What these tests are about
Tests verify **app behavior**, not Supabase itself.

They check:
- User interaction works
- Correct database functions are called
- Navigation happens after actions

---

## CRUD Breakdown

### CREATE
- User inputs data
- `insert()` is called
- App navigates back

Flow:
User → type → press create → insert() → router.back()

---

### READ
- Data is fetched (`select().eq().single()`)
- State updates
- UI renders correct content

---

### UPDATE
- Existing data is loaded
- User edits input
- `update().eq()` is called with correct values
- Navigation happens

---

### DELETE
- User presses delete
- `Alert.alert()` is triggered
- Confirm button (`onPress`) is manually called in test
- `delete().eq()` runs
- Navigation happens

---

## Why mocking is used
- No real database calls
- Faster tests
- Full control over success/error cases
- No side effects (no real data created/deleted)

---

## Mock rule
The mock must match the real call chain:

Real:
from → update → eq → select → single

Mock:
from() → update() → eq() → select() → single()

If not → errors like:
".select is not a function"

---

https://oss.callstack.com/react-native-testing-library/
