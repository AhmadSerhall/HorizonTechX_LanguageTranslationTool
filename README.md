# 🌐 GlobeLingo

A modern multilingual translation web application built with **React, Node.js, Express, and Microsoft Azure Translator**.

GlobeLingo provides fast and automatic text translation across **138 languages**, with language detection, speech recognition, text-to-speech, RTL support, and a responsive interface.

This project was developed as part of my **HorizonTechX internship**, with a focus on API integration, frontend/backend architecture, accessibility, and practical multilingual user experience.

---

## ✨ Features

### 🌍 Translation

- Translation across **138 supported languages**
- Powered by **Microsoft Azure Translator**
- Automatic source-language detection
- Automatic translation while typing
- Debounced translation requests to reduce unnecessary API usage
- Manual instant translation using `Ctrl + Enter`
- Swap source and target languages
- Automatic retranslation when languages change
- Maximum input length of **5,000 characters**

### 🔎 Language Selection

- Searchable language selector
- Complete language catalog retrieved from Azure Translator
- Search languages by name or language code
- Native language names where available
- `Detect language` option for source text
- Responsive language-selection interface

### 🎤 Speech Recognition

- Voice input through the browser's **Web Speech Recognition API**
- Recognition language follows the selected source language
- Automatic translation after speech recognition completes
- Listening and processing visual states
- Graceful handling when speech recognition is unavailable in the browser

> Speech recognition support depends on the browser. Chromium-based browsers generally provide the best compatibility.

### 🔊 Text-to-Speech

GlobeLingo can read both the original and translated text aloud using the browser's **Speech Synthesis API**.

- Source text-to-speech
- Translation text-to-speech
- Automatic voice matching based on language
- Uses detected language when the source language is set to automatic detection
- Preparing, speaking, and stop states
- Prevents source and target speech from playing simultaneously
- Graceful fallback when a compatible voice is unavailable

> Available voices depend on the user's browser and operating system. Translation support does not necessarily mean that a matching speech voice is installed on the device.

### 📝 Smart Translation Experience

GlobeLingo translates automatically instead of requiring the user to repeatedly press a button.

- **700 ms debounce** for normal input
- Longer debounce for large text
- Automatic translation after paste
- Automatic translation after completed voice input
- Automatic translation when the target language changes
- Duplicate-request prevention
- Request cancellation
- Protection against stale responses and race conditions

### ⏳ Translation Loading Experience

- Dynamic teal shimmer/skeleton while translation is processing
- Skeleton size adapts to the approximate source-text length
- Supports multi-line loading states
- RTL-aware skeleton alignment
- Reduced-motion accessibility support
- Smooth result appearance after translation completes

### 🌐 Multilingual UI

The two main empty-state messages are stored locally for all supported translation languages:

- `Enter text to translate...`
- `Your translation will appear here.`

The placeholders automatically follow the selected source and target languages.

For example:

- French → `Saisissez le texte à traduire...`
- Arabic → `أدخل النص المراد ترجمته...`
- Chinese, Japanese, Greek, Korean, and other supported languages display their corresponding local versions.

These interface translations are stored locally and therefore require **no Azure API requests**.

### ↔️ RTL Support

GlobeLingo supports right-to-left languages such as:

- Arabic
- Hebrew
- Persian
- Urdu
- Other RTL languages supported by the language catalog

Text direction and alignment automatically adapt to the selected language.

### 📋 Additional UX Features

- Copy translated text to clipboard
- Clear source text
- Character counters
- Responsive desktop, tablet, and mobile layouts
- Accessible controls and labels
- Keyboard translation shortcut
- Dynamic language direction
- Source/target language swapping
- Custom GlobeLingo branding and favicon

---

## 🛠️ Tech Stack

### Frontend

- **React**
- JavaScript
- CSS
- Fetch API
- Web Speech Recognition API
- Web Speech Synthesis API

### Backend

- **Node.js**
- **Express.js**
- CORS
- dotenv

### Cloud Service

- **Microsoft Azure Translator**

---

## 🏗️ Architecture

```text
┌───────────────────────────────┐
│         React Frontend        │
│                               │
│ Text Input                    │
│ Language Selection            │
│ Speech Recognition            │
│ Speech Synthesis              │
│ Translation UI                │
└───────────────┬───────────────┘
                │
                │ /api/*
                ▼
┌───────────────────────────────┐
│      Node / Express API       │
│                               │
│ Request Validation            │
│ Azure Authentication          │
│ Translation Proxy             │
│ Language Catalog              │
└───────────────┬───────────────┘
                │
                │ HTTPS
                ▼
┌───────────────────────────────┐
│   Microsoft Azure Translator  │
└───────────────────────────────┘
```

The Azure API key is stored only on the backend and is **never exposed to the React client**.

---

## 🔐 API Key Security

GlobeLingo follows a frontend/backend architecture specifically to keep Azure credentials private.

The frontend never communicates directly with Azure Translator.

Instead:

```text
React
   ↓
Express Backend
   ↓
Azure Translator
```

Environment variables are stored in:

```text
backend/.env
```

The `.env` file is excluded from Git through `.gitignore`.

**Never commit your Azure Translator API key to GitHub.**

---

## 🚀 Running the Project Locally

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd HorizonTechX_LanguageTranslationTool
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Install backend dependencies

```bash
cd ../backend
npm install
```

### 4. Configure Azure Translator

Create:

```text
backend/.env
```

Add:

```env
AZURE_TRANSLATOR_KEY=your_azure_translator_key
AZURE_TRANSLATOR_REGION=your_azure_region
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com/
```

For example, if your Azure Translator resource uses the global region:

```env
AZURE_TRANSLATOR_KEY=your_key_here
AZURE_TRANSLATOR_REGION=global
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com/
```

Do not expose or commit the real key.

### 5. Start the backend

From `/backend`:

```bash
npm start
```

The backend runs on:

```text
http://localhost:5000
```

### 6. Start the frontend

Open another terminal and run from `/frontend`:

```bash
npm start
```

The application will normally open at:

```text
http://localhost:3000
```

---

## 🔌 API Endpoints

### Health Check

```http
GET /api/health
```

Used to verify that the backend is running.

### Supported Languages

```http
GET /api/languages
```

Retrieves the supported translation-language catalog.

### Translate

```http
POST /api/translate
```

Example request:

```json
{
  "text": "Hello, how are you?",
  "source": "en",
  "target": "fr"
}
```

Example result:

```text
Bonjour, comment allez-vous ?
```

The exact response structure depends on the normalized backend API implementation.

---

## 🧠 API Efficiency

Because GlobeLingo supports automatic translation, several protections are used to avoid unnecessary requests:

- Input debounce
- Duplicate request prevention
- Request cancellation
- Stale-response protection
- No requests for empty input
- No translation requests for microphone interim results
- Localized UI placeholders stored locally
- Browser-based text-to-speech instead of translation API calls
- Browser-based speech recognition

This allows the interface to feel responsive while keeping external API usage controlled.

---

## 🧪 Testing

The project contains automated frontend and backend tests covering important behavior including:

- Automatic translation
- Debouncing
- Language changes
- Placeholder localization
- Translation request handling
- Race-condition protection
- Speech synthesis states
- Unsupported speech voices
- Microphone interaction
- Source and target TTS
- Language catalog coverage

Run frontend tests:

```bash
cd frontend
npm test
```

Run backend tests:

```bash
cd backend
npm test
```

Create a production frontend build:

```bash
cd frontend
npm run build
```

---

## 📱 Responsive Design

GlobeLingo is designed for:

- Desktop
- Laptop
- Tablet
- Mobile

The translation panels, language selector, controls, and language-swap interaction adapt to different screen sizes.

---

## ⚠️ Browser Compatibility

Some functionality depends on browser capabilities.

**Translation:**  
Handled through Azure Translator and available independently of browser speech support.

**Text-to-Speech:**  
Uses `window.speechSynthesis`. Available voices depend on the browser and operating system.

**Speech Recognition:**  
Uses `SpeechRecognition` / `webkitSpeechRecognition`. Browser support varies, with Chromium-based browsers generally providing the best experience.

A language can therefore be supported for **translation** while not having an available **speech voice** on a particular device.

---

## 📸 Screenshots

### Translation

<!-- Add your final GlobeLingo screenshot here -->

```text
screenshots/translation.png
```

### Language Selection

<!-- Add a screenshot of the searchable language selector -->

```text
screenshots/language-selector.png
```

### RTL Translation

<!-- Add an Arabic or other RTL translation example -->

```text
screenshots/rtl-translation.png
```

---

## 🎯 Project Goals

This project was created to practice and demonstrate:

- Integration with a real cloud translation API
- Secure handling of API credentials
- React frontend development
- Node.js/Express backend development
- REST API communication
- Asynchronous request handling
- Debouncing and request optimization
- Browser speech APIs
- Multilingual and RTL interfaces
- Responsive UI/UX
- Error handling
- Automated testing

---

## 👨‍💻 Author

**Ahmad Serhal**

Computer Science graduate and Master's student in Artificial Intelligence.

- GitHub: `AhmadSerhall`
- LinkedIn: `ahmadserhal1`
- Portfolio: `ahmadserhal.dev`

---

## 📄 Project Context

GlobeLingo was developed as part of my **HorizonTechX internship** language translation tool task.

The original task focused on:

- Text input
- Source and target language selection
- Translation API integration
- Displaying translated output
- Optional copy and text-to-speech functionality

The project was expanded beyond the base requirements with automatic translation, speech recognition, source and target TTS, a complete Azure language catalog, multilingual UI placeholders, RTL support, responsive design, API-efficiency protections, and additional UX improvements.

---

## 📄 License

This project is intended for educational, internship, and portfolio purposes.
