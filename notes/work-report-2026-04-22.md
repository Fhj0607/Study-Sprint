## #Overview

Implemented a full local notification system for assignment deadlines using Expo Notifications, integrated with Supabase-backed assignment data.

---

## #CoreFeatures

### #LocalNotifications

* Integrated `expo-notifications` for scheduling local device notifications
* Configured notification handler for:

  * banner display
  * sound
  * badge updates
* Notifications trigger even when:

  * app is in background
  * app is fully closed

---

### #DeadlineReminderLogic

* Implemented reminder scheduling based on assignment deadlines
* Default behavior:

  * notify **24 hours before deadline**
* Prevented invalid scheduling:

  * skip if reminder time is in the past
  * validate deadline input before scheduling

---

### #AssignmentIntegration

* Notifications tied directly to assignment lifecycle:

#### On Create:

* Insert assignment into Supabase
* Retrieve inserted assignment (`aId`)
* Schedule reminder if not completed

#### On Edit:

* Cancel existing scheduled notification
* Update assignment in Supabase
* Schedule new reminder if still active

#### On Delete:

* Cancel scheduled notification
* Remove stored notification reference

---

### #NotificationPersistence

* Stored notification IDs locally using AsyncStorage
* Structure:

  * `assignmentId → notificationId`
* Enables:

  * precise cancellation
  * avoiding duplicate notifications

---

### #NotificationCancellation

* Implemented cancellation flow using:

  * `Notifications.cancelScheduledNotificationAsync(notificationId)`
* Ensures:

  * no duplicate reminders on edit
  * no orphan notifications after deletion

---

### #NotificationRouting

* Implemented navigation on notification tap
* Uses:

  * `Notifications.addNotificationResponseReceivedListener`
  * `Notifications.getLastNotificationResponse()`

#### Behavior:

* Works when:

  * app is open
  * app is in background
  * app is launched from notification

#### Routing:

* Extract `aId` from `notification.content.data`
* Navigate using Expo Router:

```ts
router.push({
  pathname: "/assignment/viewDetailsAssignment",
  params: { aId }
});
```

---

### #AuthIntegration

* Notification observer only runs when user session exists
* Prevents routing into protected screens when unauthenticated

---

## #ArchitectureDecisions

### #LocalVsBackend

* Chose **local notifications only**
* No backend push notifications used
* Rationale:

  * single-user reminders
  * simpler implementation
  * no need for push tokens or server logic

---

### #DataSeparation

* Supabase:

  * stores assignment data (source of truth)
* Device (AsyncStorage):

  * stores notification IDs (device-specific state)

---

### #RoutingApproach

* Used existing static route:

  * `/assignment/viewDetailsAssignment`
* Passed `aId` via params instead of dynamic route `[aId].tsx`
* Keeps current structure intact

---

## #Summary

A complete local notification system has been implemented with:

* deadline-based scheduling
* lifecycle-aware updates (create/edit/delete)
* duplicate prevention
* device-level persistence
* deep-link style navigation on tap

This provides a solid, production-ready foundation for assignment reminders within the app.


Interesting sources:
https://docs.expo.dev/versions/latest/sdk/async-storage/
https://docs.expo.dev/versions/latest/sdk/securestore/
https://docs.expo.dev/versions/latest/sdk/notifications/
