# react-native-liftoff — Example App

A multi-screen demo that exercises every API in `react-native-liftoff` and produces realistic boot-time measurements using real native module initialization.

## What this app demonstrates

| Library API | Where it's used |
|---|---|
| `mark(name)` | Module scope in `App.tsx`, `useEffect` in each screen |
| `createPageScope(name)` | Every screen — marks prefixed `page:<Screen>:` |
| `markTTI()` | Each screen marks TTI at the appropriate lifecycle point |
| `getReport()` | `HomeScreen` — displays the boot timeline on load |
| `<DevMenuReport />` | Mounted in `App.tsx`; triggered via dev menu or Home screen button |

## Running the app

```sh
# From the repo root
yarn install

# iOS
cd example/ios && bundle exec pod install && cd ../..
yarn ios           # or: cd example && yarn ios

# Android
yarn android       # or: cd example && yarn android
```

## Viewing the report

**Dev menu trigger** (debug builds only):
- iOS Simulator: `Cmd+D`
- Android Emulator: `Cmd+M` (macOS) / `Ctrl+M` (Windows/Linux)
- Physical device: shake

Select **"Show Liftoff Report"** from the menu.

**Home screen button**: Tap **"Show Boot Report"** on the Home screen — only visible in `__DEV__` mode.

## Boot checkpoints

These marks are recorded in native code **before** the React Native JS bundle loads, giving you a complete timeline from app launch to first render.

### iOS (`AppDelegate.swift`)

| Mark | Lifecycle point |
|---|---|
| `app:didFinishLaunching:start` | First line of `application(_:didFinishLaunchingWithOptions:)` |
| `rn:factory:willStart` | Immediately before `factory.startReactNative(...)` |
| `app:didFinishLaunching:end` | Last line of the launch method (before `return true`) |

Timestamps use `mach_absolute_time()` via `LiftoffCollector` — same clock as JS marks recorded later.

### Android (`MainApplication.kt`)

| Mark | Lifecycle point |
|---|---|
| `app:onCreate:start` | First line of `onCreate()` |
| `rn:host:willInit` | Before `loadReactNative(this)` |
| `rn:host:didInit` | After `loadReactNative(this)` returns |
| `app:onCreate:end` | Last line of `onCreate()` |

Timestamps use `SystemClock.elapsedRealtime()`.

> **Note:** iOS and Android use different clocks. Timestamp values are not comparable across platforms, but durations within a single session are meaningful.

### JS checkpoints (`App.tsx`)

| Mark | When |
|---|---|
| `js:appComponent:render` | Module scope — when `App.tsx` is first evaluated by the JS engine |
| `js:appComponent:mounted` | `useEffect` with empty deps in the root `App` component |

## Screens and their page-scope marks

| Screen | Page scope | Marks |
|---|---|---|
| Home | `page:Home:` | `mounted`, `tti` |
| HeavyList | `page:HeavyList:` | `mounted`, `firstItemRendered`, `tti` (FlashList `onLoad`) |
| Animated | `page:Animated:` | `mounted`, `firstFrame` (via Reanimated `runOnJS`), `tti` |
| Storage | `page:Storage:` | `mmkv:start`, `mmkv:done`, `asyncStorage:start`, `asyncStorage:done`, `tti` |
| Form | `page:Form:` | `mounted`, `tti` (first `onFocus`) |
