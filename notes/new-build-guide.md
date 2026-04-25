# DevelopmentBuildGuide

This project uses an **Expo development build** for features that are not fully supported in Expo Go, such as our notification setup.

---

## WhyWeUseThis

We do **not** use Expo Go for this project when testing notifications or other native features.

Reason:
- Expo Go has limitations for some native modules
- `expo-notifications` on Android requires a development build for reliable testing
- a development build works like a custom Expo Go app made specifically for this project

---

## #ImportantRule

You do **not** need to rebuild the APK for every code change.

### Rebuild is **not needed** for:
- changing React components
- changing screen layouts
- changing styles
- changing Supabase queries
- changing JS/TS functions
- changing form logic
- changing routing logic
- changing notification scheduling logic in JavaScript only

### Rebuild **is needed** for:
- adding a new native dependency
- removing a native dependency
- changing `app.json`
- changing Expo plugins
- changing Android/iOS permissions
- changing native notification config
- anything that affects the native app shell

---

## OneTimeSetup
Install EAS CLI globally if needed:
npm install -g eas-cli

Log in to Expo:
eas login

Install the Expo development client in the project:
npx expo install expo-dev-client

# BuildTheDevelopmentAPK
Run this command from the project root:
eas build --platform android --profile development

This sends the build to Expo's cloud build service.

When the build is finished:

open the build link
click Install
install the APK on your Android phone or emulator
Do not place the APK inside the project folder.
The APK is something you install on the device, not a source file.

# DailyWorkflow
After the development build APK is installed:

Start the project:
npx expo start