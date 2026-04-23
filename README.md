# AI-Enhanced Ebook Reader

A full-stack mobile/web application that enhances ebook reading with AI-powered assistance, reading analytics, and social discovery features.

**Tech Stack:**
- **Backend:** Node.js + Express + SQLite
- **Frontend:** React Native + Expo (TypeScript)
- **AI:** OpenRouter API (OpenAI GPT-4)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
   - [Option 1: EAS Build (Recommended for Everyone)](#option-1-eas-build-recommended-for-everyone)
   - [Option 2: Android Studio (For Android Developers)](#option-2-android-studio-for-android-developers)
5. [Configuration](#configuration)
6. [Running the Application](#running-the-application)
7. [API Routes](#api-routes)
8. [Troubleshooting](#troubleshooting)

---

## Project Overview

This is an AI-enhanced ebook reader application designed for:
- **Students** - Get summaries and explanations of complex sections
- **Knowledge workers** - Learn faster with limited reading time
- **Book enthusiasts** - Better reading experience with progress tracking

### Core Features
- 📚 **EPUB & PDF Support** - Read both formats seamlessly
- 🤖 **AI Summaries** - AI-generated chapter and text summaries
- 📊 **Reading Analytics** - Track pages, time, streaks, and completed books
- 🏷️ **Personal Library** - Upload, organize, and manage ebooks
- 📝 **Notes & Highlights** - Bookmark pages, highlight text, add notes
- 🌙 **Dark Mode** - Comfortable reading in any lighting

---

## Prerequisites

### For Backend
- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

### For Frontend
- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn**

### For Building/Running on Android

Choose one based on your preference:

#### Option A: EAS Build (Cloud-based - No Local Setup Needed)
- **EAS CLI** - Command-line tool for Expo builds
- **Expo Account** - Free account at [expo.dev](https://expo.dev)
- **Android Phone** - Physical device or emulator

#### Option B: Android Studio (Local Development)
- **Android Studio** - [Download](https://developer.android.com/studio)
- **Java Development Kit (JDK)** - Usually included with Android Studio
- **Android SDK** - Configured via Android Studio
- **Android Virtual Device (AVD)** - Or use a physical device

### Optional: AI Features
- **OpenRouter API Key** - [Get free key](https://openrouter.ai/keys)
- Used for AI summaries, key ideas extraction, and text explanations

---

## Backend Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=./data/library.db

# JWT Authentication
JWT_SECRET=your-secure-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# File Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=100

# AI Features (Optional - Get from https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
OPENROUTER_MODEL=openai/gpt-4o-mini (or any model you want)
```

### 4. Initialize Database

The database initializes automatically on first run. The SQLite database will be created at `backend/data/library.db`.

### 5. Start Backend Server

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The server will start on `http://localhost:4000`

### Verify Backend is Running (Run this on your phone browser too)

```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{ "status": "ok" }
```

---

## Frontend Setup

Before starting frontend, ensure backend is running on port 4000.

### Update Backend URL Configuration

Edit [frontend-app/src/constants/config.ts](frontend-app/src/constants/config.ts):

```typescript
// Change based on your environment:
//   Android emulator:  10.0.2.2
//   iOS simulator:     localhost
//   Physical device:   your machine's LAN IP (run: ipconfig on Windows, ifconfig on Mac/Linux)

const HOST = 'YOUR_MACHINE_IP_OR_LOCALHOST';  // Change this!
const PORT = 4000;

export const BASE_URL = `http://${HOST}:${PORT}/api`;
```

**To find your machine IP:**
- **Windows:** Open Command Prompt and run `ipconfig`, look for "IPv4 Address"
- **Mac/Linux:** Open Terminal and run `ifconfig`, look for "inet" address

---

### Option 1: EAS Build (Recommended for Everyone)

**Advantages:**
- No local Android setup required
- Works on Windows, Mac, Linux
- Easiest for getting a production-ready APK
- Free tier available

#### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

#### Step 2: Sign Up / Log In

```bash
eas login
```

Visit [expo.dev](https://expo.dev) to create a free account if you don't have one.

#### Step 3: Navigate to Frontend

```bash
cd frontend-app
```

#### Step 4: Build APK for Android

```bash
eas build --platform android --local
```

Or build in the cloud (doesn't require local Android setup):

```bash
eas build --platform android
```

#### Step 5: Download and Install APK

- Once build completes, download the `.apk` file
- Transfer to your Android device
- Or install on emulator:

```bash
# If you have Android SDK tools set up
adb install path/to/app.apk
```

#### Step 6: Launch App

Open the app on your Android device.

---

### Option 2: Android Studio (For Android Developers)

**Advantages:**
- Full control over build process
- Can debug and develop directly
- Works offline after initial setup
- Better for ongoing development

#### Step 1: Install Android Studio

Download from [developer.android.com/studio](https://developer.android.com/studio) and follow installation wizard.

#### Step 2: Set Environment Variables

After Android Studio installation, set these environment variables:

**Windows:**
```powershell
# Add to your system environment variables
ANDROID_HOME = C:\Users\YourUsername\AppData\Local\Android\Sdk
```

Add `%ANDROID_HOME%\platform-tools` to your PATH.

**Mac/Linux:**
```bash
export ANDROID_HOME=$HOME/Library/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

#### Step 3: Create Android Virtual Device (AVD)

In Android Studio:
1. Click **Tools** → **Device Manager**
2. Click **Create Device**
3. Select a device (e.g., Pixel 5)
4. Choose API level (33 or higher recommended)
5. Finish and start the emulator

#### Step 4: Navigate to Frontend

```bash
cd frontend-app
```

#### Step 5: Install Dependencies

```bash
npm install
```

#### Step 6: Start Expo Dev Client

```bash
npm run android
```

This will:
- Start the Expo development server
- Compile the React Native code
- Install and launch the app on your AVD or connected device

#### Step 7: View App

The app will automatically open on your Android device/emulator.

**Hot Reload:** Make code changes and save - the app will auto-reload.

---

> **Note:** This project uses native libraries (`react-native-pdf`, `react-native-blob-util`, etc.) that are not compatible with the standard Expo Go app. You must use either **EAS Build** or **Android Studio** to run the app.

---

## Configuration

### Backend Configuration

**Environment Variables** (`.env` file):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `JWT_SECRET` | `dev-secret-...` | Secret key for JWT tokens (change in production!) |
| `JWT_EXPIRES_IN` | `7d` | Token expiration time |
| `UPLOAD_DIR` | `./uploads` | Directory for uploaded files |
| `MAX_FILE_SIZE_MB` | `100` | Max file upload size in MB |
| `OPENROUTER_API_KEY` | - | Optional: API key for AI features |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | AI model to use |

### Frontend Configuration

**API Connection** (`frontend-app/src/constants/config.ts`):

```typescript
const HOST = '10.229.120.85';  // Your machine IP
const PORT = 4000;              // Backend port

export const BASE_URL = `http://${HOST}:${PORT}/api`;
```

**Common HOST Values:**
- Local development: `localhost` or `127.0.0.1`
- Android Emulator: `10.0.2.2` (special emulator IP)
- iOS Simulator: `localhost`
- Physical Device: Your actual machine IP (get with `ipconfig`)

---

## Running the Application

### Recommended Development Setup

**Terminal 1 - Start Backend:**

```bash
cd backend
npm run dev
```

Expected output:
```
Server running on :4000
Database initialized
```

**Terminal 2 - Start Frontend (choose one method):**

#### Using EAS Build:
```bash
cd frontend-app
eas build --platform android --local
```

#### Using Android Studio:
```bash
cd frontend-app
npm run android
```

### First-Time User Flow

1. **Launch App** - You'll see the Login screen
2. **Create Account** - Tap "Sign Up" and register
3. **Login** - Use your credentials
4. **Empty Library** - First time shows empty library
5. **Upload a Book** - Tap the upload button
   - Select EPUB or PDF file
   - Wait for upload to complete
6. **Read Book** - Tap the book to start reading
7. **Try AI Features** - While reading, use AI tools (if API key configured)

---

## API Routes

### Authentication
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login user
POST   /api/auth/logout        - Logout user
GET    /api/auth/me            - Get current user
```

### Library
```
GET    /api/library            - List user's books
GET    /api/library/:id        - Get book details
POST   /api/library/upload     - Upload new book
DELETE /api/library/:id        - Delete book
GET    /api/library/stats      - Get reading statistics
```

### Reader
```
GET    /api/reader/:bookId     - Get book content
POST   /api/reader/bookmarks   - Create bookmark
GET    /api/reader/bookmarks   - List bookmarks
POST   /api/reader/highlights  - Create highlight
POST   /api/reader/notes       - Create note
```

### AI
```
POST   /api/ai/summarize       - Summarize text/chapter
POST   /api/ai/explain         - Explain selected text
POST   /api/ai/keyideas        - Extract key ideas
```

### Health
```
GET    /api/health             - Health check
```

---

## Troubleshooting

### Backend Issues

#### Port 4000 Already in Use

```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :4000
kill -9 <PID>
```

#### Database Errors

Delete the existing database and restart:

```bash
rm backend/data/library.db
npm run dev
```

#### Cannot Connect from Frontend

1. Verify backend is running: `curl http://localhost:4000/api/health`
2. Check firewall settings - allow Node.js through firewall
3. Update `config.ts` with correct IP address
4. On Android Emulator, use `10.0.2.2` instead of `localhost`
5. On physical device, use your actual machine IP

### Frontend Issues

#### App Keeps Disconnecting

- Ensure phone is on same Wi-Fi as development machine
- Restart Expo server: `npm start`
- Clear Expo cache: `expo start --clear`

#### Cannot Find Module / Dependency Errors

```bash
cd frontend-app
rm -rf node_modules package-lock.json
npm install
```

#### Android Emulator Not Starting

1. Open Android Studio
2. Go to **Device Manager**
3. Click **Play** button next to your device
4. Wait for emulator to fully load before running `npm run android`

#### EAS Build Fails

```bash
# Clear build cache and try again
eas build --platform android --clear-cache
```

### General Issues

#### "Cannot read property 'readFileSync' of undefined"

Restart backend - the database initialization needs to complete:
```bash
npm run dev
```

#### Network Timeout / Slow Uploads

- Check internet connection
- Reduce file size for testing
- If uploading large files, increase `MAX_FILE_SIZE_MB` in `.env`

#### AI Features Not Working

- Verify `OPENROUTER_API_KEY` is set in `.env`
- Check API key is valid on [openrouter.ai/keys](https://openrouter.ai/keys)
- Ensure sufficient API credits

### Getting Help

1. Check logs in both backend and frontend terminals
2. Verify all environment variables are set correctly
3. Ensure Node.js version is >= 18.0.0: `node --version`
4. Try restarting both backend and frontend

---

## Project Structure

```
backend/
├── src/
│   ├── server.js           # Express server setup
│   ├── controllers/        # Route handlers
│   ├── services/          # Business logic
│   ├── routes/            # API routes
│   ├── middleware/        # Auth, upload handlers
│   ├── db/                # Database setup
│   │   ├── index.js       # DB initialization
│   │   └── schema.sql     # Database schema
│   └── utils/             # Utilities
├── uploads/               # Uploaded files
├── data/                  # SQLite database
└── package.json

frontend-app/
├── src/
│   ├── screens/           # App screens
│   ├── components/        # Reusable components
│   ├── services/          # API client
│   ├── context/           # React context (auth, theme)
│   ├── types/             # TypeScript types
│   ├── constants/         # Config, theme
│   └── App.tsx            # Main app component
├── assets/                # Images, fonts
├── app.json               # Expo config
├── eas.json               # EAS build config
└── package.json
```

---

## Development Notes

### Adding a New API Endpoint

1. Create handler in `backend/src/controllers/`
2. Add route in `backend/src/routes/`
3. Import route in `backend/src/server.js`
4. Call from frontend using `client` in `frontend-app/src/services/api.ts`

### Building for Production

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
eas build --platform android  # Builds production APK
```

---

## License & Credits

This is an educational project for teaching full-stack development with React Native, Node.js, and AI integration.

---

**Happy Reading! 📚**
