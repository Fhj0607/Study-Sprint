# Study Sprint – React Native (Expo)

## How to run the source code

This explains how to run the app with Expo.

To use database features, create a `.env` file in the project root and set the following environment variables:

- `EXPO_PUBLIC_SUPABASE_URL=your_url`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key`

## Requirements

- Node.js
- npm
- Expo CLI
- Android Studio with an emulator OR Expo Go on a phone

## Install dependencies

```bash
npm install
```

## Run the app

```bash
npm run start
```

After starting expo, you can:
- scan the QR code with Expo Go on your phone, or
- press a in the terminal to open the app in the Android emulator

If you use the Android emulator, make sure it is already running before starting the app.

## Requirements met

- Code is clean and professional, and contains zero console.logs: 10%
- Pagination and load More functionality using range: 20%
- Auth is now also properly handled in root / _layout.tsx: 10%

There is not a really a "test" I can do, because the user is unable to access anything other than auth-screen unless they are logged in. No matter which screen the user is on, unless they are logged in, they will be re-routed to auth. This is how I designed auth-management making a test difficult to simulate. On top of this, no note is loaded if user is not "authenticated". This is handled on the back-end with RLS.

Thank you for a second chance, I have learned my lesson.

- Total: 40%
