# AiGaido App

AiGaido is a React Native application for Android and iOS. This guide describes how to prepare a new development computer, configure the application, and run it locally.

## Contents

- [Prerequisites](#prerequisites)
- [Clone and install dependencies](#clone-and-install-dependencies)
- [Configure environment variables](#configure-environment-variables)
- [Run on Android](#run-on-android)
- [Run on iOS](#run-on-ios)
- [Useful commands](#useful-commands)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### All platforms

Install the following before cloning the repository:

| Tool | Required version | Purpose |
| --- | --- | --- |
| [Git](https://git-scm.com/downloads) | Current stable release | Clone the source code. |
| [Node.js](https://nodejs.org/) | **22.11.0 or newer** | Run Metro and install JavaScript dependencies. |
| npm | Bundled with Node.js | Install locked project dependencies. |

Check the installations:

```sh
git --version
node --version
npm --version
```

> Use a Node.js version supported by the project (`>= 22.11.0`). If you use `nvm`, run `nvm install 22` followed by `nvm use 22`.

### Android

Install these Android development tools:

1. [Android Studio](https://developer.android.com/studio).
2. A **JDK 17** installation and a `JAVA_HOME` environment variable that points to it.
3. In Android Studio, open **Settings/Preferences → Android SDK** and install:
   - Android SDK Platform **36**;
   - Android SDK Build-Tools **36.0.0**;
   - Android SDK Command-line Tools (latest);
   - Android Emulator and an emulator system image.
4. Create and boot an Android Virtual Device (AVD), or connect a physical device with USB debugging enabled.

The app builds with Android SDK 36, Build-Tools 36.0.0, and requires Android API level 24 or later.

#### Android environment variables

Set `ANDROID_HOME` to your SDK location and add Android tools to `PATH`.

**macOS/Linux (`~/.zshrc` or `~/.bashrc`):**

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk" # macOS default
# Linux commonly uses: export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
```

Restart the terminal, then confirm the device is visible:

```sh
adb devices
```

**Windows (PowerShell):** set `ANDROID_HOME` to the Android SDK directory (commonly `%LOCALAPPDATA%\Android\Sdk`) in System Environment Variables. Add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to `Path`, reopen PowerShell, then run:

```powershell
adb devices
```

### iOS (macOS only)

iOS builds require macOS. Install:

1. Xcode from the Mac App Store; launch it once and accept its licence.
2. Xcode Command Line Tools:

   ```sh
   xcode-select --install
   ```

3. Ruby and Bundler. The project `Gemfile` installs the compatible CocoaPods version.

## Clone and install dependencies

Clone the repository and install the exact dependency versions recorded in `package-lock.json`:

```sh
git clone <REPOSITORY_URL>
cd AiGaido-frontend
npm ci
```

Use `npm ci` for a fresh checkout. Use `npm install` only when intentionally updating dependencies and the lockfile.

## Configure environment variables

The application reads its configuration from a root-level `.env` file. Start from the committed template:

```sh
cp .env.example .env
```

Update `.env` with credentials supplied by the project owner:

```dotenv
# Base URL of the AiGaido backend. Do not append a trailing slash unless the API requires it.
API_URL=https://api.example.com

# Google Maps Platform key. Enable Maps SDK for Android and Places API (New).
GOOGLE_MAPS_API_KEY=replace_with_google_maps_key

# Razorpay test or live key ID used by the payment flow.
RAZORPAY_KEY_ID=replace_with_razorpay_key_id
```

Do not commit `.env` or real keys. Obtain the API URL and credentials securely from the project owner. After changing `.env`, stop Metro and rebuild the native app so `react-native-config` can include the updated values.

### Google Maps key setup

For Android, enable **Maps SDK for Android** in the Google Cloud project and restrict the key to the app's Android package name and signing certificate as appropriate. The Android application ID is `com.geomap.ai`. The app also uses the Google Places API for place photos, so enable **Places API (New)** for the same key/project when that feature is used.

## Run on Android

1. Boot an emulator from Android Studio's Device Manager, or connect a device.
2. Confirm it is available:

   ```sh
   adb devices
   ```

3. From the project root, start Metro:

   ```sh
   npm start
   ```

4. Keep Metro running. In a second terminal at the project root, build and install the debug app:

   ```sh
   npm run android
   ```

The first Android build downloads Gradle and native dependencies and can take several minutes. For a device connected over USB, run `adb reverse tcp:8081 tcp:8081` if Metro cannot be reached.

## Run on iOS

From the project root, install both JavaScript and CocoaPods dependencies:

```sh
npm ci
bundle install
cd ios
bundle exec pod install
cd ..
```

Then start Metro in one terminal:

```sh
npm start
```

In another terminal, launch the app in the selected iOS Simulator:

```sh
npm run ios
```

Run `bundle exec pod install` again whenever native iOS dependencies change. To select a specific simulator, use React Native CLI options, for example `npx react-native run-ios --simulator="iPhone 16"`.

## Useful commands

| Command | Description |
| --- | --- |
| `npm start` | Start the Metro JavaScript bundler. |
| `npm run android` | Build, install, and launch the Android debug app. |
| `npm run ios` | Build and launch the iOS app (macOS only). |
| `npm test` | Run Jest tests. |
| `npm run lint` | Run ESLint across the project. |
| `cd android && ./gradlew clean && cd ..` | Clean Android Gradle build output. |
| `cd ios && bundle exec pod install && cd ..` | Reinstall CocoaPods dependencies. |

## Troubleshooting

### `SDK location not found` or Android SDK errors

Verify `ANDROID_HOME`, install Android SDK Platform 36 and Build-Tools 36.0.0 through Android Studio, reopen the terminal, and retry `npm run android`.

### `JAVA_HOME is not set` or Gradle cannot use Java

Install JDK 17, point `JAVA_HOME` to the JDK installation folder, reopen the terminal, and check with `java -version`.

### No Android devices or emulators found

Boot an AVD in Android Studio's Device Manager or connect a USB-debugging-enabled device. Confirm that `adb devices` reports it as `device` before rerunning the Android command.

### Metro cannot connect from an Android device

Keep `npm start` running and execute:

```sh
adb reverse tcp:8081 tcp:8081
```

Then reload the app.

### Configuration values are missing or Google Maps is blank

Confirm that `.env` exists in the repository root, its variable names exactly match `.env.example`, and the Google API key has the required Maps and Places APIs enabled. Stop Metro, uninstall/rebuild the app, and run it again after changing the file.

### iOS CocoaPods installation fails

Run `bundle install` from the repository root first, then use `bundle exec pod install` from `ios/`. This ensures the CocoaPods version defined by the project is used.
