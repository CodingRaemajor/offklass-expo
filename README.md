# 📚 Offklass

> **AI-powered, offline-first learning platform for Grades 3–11**  
> Learn anywhere, anytime — even without the internet.

---

## 📖 Overview

**Offklass** is an **offline-first EdTech platform** designed for students in **Grades 3–11**, with a strong focus on **low-connectivity, rural, and underserved environments**.

It combines **offline videos, adaptive quizzes, smart flashcards, and a local AI tutor** into a single lightweight mobile app. All core learning features are designed to work **without internet access**, making Offklass suitable for schools, NGOs, and communities where reliable connectivity is limited.

✨ **Why Offklass?**

- ✅ **Grades 3–11 learning vision** *(current MVP focused on Grade 4 Math)*
- 🌍 **Multilingual support** (English, Hindi, Urdu, Nepali, Bangla)
- 📦 **Offline-first by design** — no internet required during learning
- 🧠 **Local AI Tutor** powered by **on-device LLMs**
- 🎥 **Preloaded offline videos** for lesson-based learning
- 📝 **Adaptive quizzes** with explanations and local progress tracking
- 🧩 **Smart flashcards** with practice and mastery flow
- ⚡ **Optimized for low-end Android devices**
- 🔄 **Local sync** via Wi‑Fi / LAN (no cloud dependency)
- 🔒 **Privacy-first** — student data stays on-device

---

## 🎯 Current Focus (MVP)

The current MVP is intentionally **focused, stable, and demo-ready**:

- 🎓 **Grade 4 Math** core concepts
- 📼 **Offline video lessons** bundled inside the app
- 🧠 **Offline AI tutor** for explanations and question answering
- 📝 **Flashcards & quizzes** stored locally
- 🌐 **No internet dependency** during actual usage

This MVP is built to validate **offline AI learning at scale** before expanding to more grades and subjects.

---

## 🧠 AI Tutor (Offline)

The Offklass AI tutor runs **fully on-device** using **`llama.cpp`** with a lightweight quantized model.

### Current model

- **SmolLM2** (GGUF quantized model from Hugging Face)

### AI capabilities

- 💬 Answers student questions offline
- 📘 Explains Grade 4 math concepts in simple language
- ➗ Provides structured math help and step-by-step guidance
- 📝 Supports quiz explanation flow
- 🧠 Powers flashcard and quiz generation logic

### Why offline AI?

- No API calls
- No recurring cost
- Reliable in rural and low-connectivity environments
- Privacy-first: student data never leaves the device
- Works even in airplane mode ✈️

---

## 🛠️ Tech Stack

### 📱 Mobile App

- **React Native** (Expo → Bare workflow)
- **TypeScript**
- **Tailwind CSS**

### 🧠 Offline AI

- **llama.cpp** (native C++ integration)
- **llama.rn** bridge
- **SmolLM2** GGUF quantized model from Hugging Face

### 💾 Storage

- **AsyncStorage**
- **SQLite** *(planned / expanding usage)*
- **Local JSON datasets**

### 🔄 Local Sync

- **Flask LAN server**
- Device-to-device sync over Wi‑Fi

### 🌍 Internationalization

- JSON-based i18n system
- Easy language expansion

---

## 📂 Project Structure

```bash
offklass/
├── android/                  # Native Android + llama.cpp integration
├── ios/                      # iOS (future parity)
├── app/(tabs)/               # Main app tabs/screens
│   ├── ai.tsx                # AI tutor screen
│   ├── lessons.tsx           # Offline lessons screen
│   ├── quizzes.tsx           # Quiz system
│   └── flashcards.tsx        # Flashcard system
├── lib/
│   ├── ai.local.ts           # Local AI engine + prompts + generation logic
│   ├── lessonTranscripts.ts  # Lesson transcript data
│   ├── quizBank.ts           # Quiz fallback / local banks
│   ├── knowledgeBase.ts      # Knowledge support files
│   └── LocalModel.ts         # Model loading / download logic
├── assets/
│   ├── videos/               # Offline lesson videos
│   └── transcripts/          # Lesson transcript files
├── models/                   # Offline LLM models (.gguf)
├── server/                   # Flask-based LAN sync server
└── README.md
```

---

## 🚀 Getting Started

### 1️⃣ Clone the repository

```bash
git clone https://github.com/CodingRaemajor/Offklass.git
cd Offklass
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Run on Android

```bash
npx expo run:android
```

---

## 🧠 Offline Model Setup

Place your quantized **SmolLM2** GGUF model inside:

```bash
android/app/src/main/assets/models/
```

Example:

```bash
smollm2-1.7b-instruct-q4_k_m.gguf
```

The model is loaded through **native llama.cpp bindings**.

> ⚠️ Use quantized models for better performance on low-end Android devices.

---

## 🌍 Supported Languages

- English
- Hindi
- Urdu
- Nepali
- Bangla

*(More languages can be added easily through JSON packs.)*

---

## 🗺️ Roadmap

### ✅ Completed

- Offline video playback
- Flashcards and quizzes
- Multilingual system
- Local-first storage
- Core offline AI integration
- Improved quiz and flashcard generation flow

### 🔄 In Progress

- More detailed offline AI tutoring
- Faster quiz and flashcard generation
- LAN-based device sync
- Better on-device model performance and response quality

### 🔜 Planned

- More grades (3–11)
- Science, English, and Social Studies
- Teacher / Admin dashboard
- Offline analytics
- NGO / school deployment mode
- Dedicated tablet / kiosk mode for focused learning

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

## 👤 Team

**Parth Patel**  
Software Systems Engineering — University of Regina  
Founder and Lead Developer, **Offklass** | Enactus Regina

**Saumin Bhagatwala**  
Software System Development — University of Regina  
Backend DevOps, **Offklass** | Enactus Regina

---

## 🌟 Impact & Vision

🎯 **Problem:** Millions of students lack reliable internet access.

💡 **Solution:** A fully offline, AI-powered learning platform that brings modern learning tools directly to the device.

🌍 **Impact:**

- Supports **SDG 4 – Quality Education**
- Reduces digital inequality
- Enables learning anywhere, anytime
- Makes AI-powered education available beyond urban, high-connectivity regions

---

## 🔥 What Makes Offklass Different?

- Not just low-data — **fully offline**
- Not cloud AI — **on-device intelligence**
- Not a concept only — **built for real educational environments**

---

⭐ If you believe in **accessible education**, consider starring the repo and sharing Offklass.