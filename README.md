# 📚 Offklass

> **AI-powered, offline-first learning platform for Grades 3–11**\
> Learn anywhere, anytime — even without the internet.

---

## 📖 Overview

**Offklass** is an **offline-first EdTech platform** built to support students in **Grades 3–11**, with a strong focus on **low-connectivity and rural environments**.

It combines **offline videos, flashcards, quizzes, and a local AI tutor** into a single lightweight mobile app. All learning content and AI assistance work **without internet access**, making Offklass suitable for schools, NGOs, and underserved communities.

✨ **Why Offklass?**

- ✅ **Grades 3–11 curriculum** (MVP focused on Grade 4)
- 🌍 **Multilingual support** (English, Hindi, Urdu, Nepali, Bangla)
- 📦 **Offline-first by design** — no internet required
- 🧠 **Local AI Tutor** powered by **on-device LLMs**
- 🎥 **Preloaded offline videos** (Khan Academy–style learning)
- 📝 **Flashcards & quizzes** with local progress tracking
- ⚡ **Optimized for low-end Android devices**
- 🔄 **Local sync** via Wi‑Fi / LAN (no cloud dependency)

---

## 🎯 Current Focus (MVP)

The current MVP is intentionally **narrow and reliable**:

- 🎓 **Grade 4 Math** (core concepts)
- 📼 **Offline video lessons** bundled inside the app
- 🧠 **Offline AI tutor** (question answering + explanations)
- 📝 **Flashcards & quizzes** stored locally
- 🌐 **No internet dependency** during usage

This MVP validates **offline AI learning at scale** before expanding to more grades and subjects.

---

## 🧠 AI Tutor (Offline)

- Runs **fully on-device** using `llama.cpp`
- Uses **quantized LLMs** (currently Qwen / Phi family)
- No API calls, no data leakage
- Works even in airplane mode ✈️

**Why offline AI?**

- Privacy-first (student data never leaves device)
- Zero recurring costs
- Reliable in low-connectivity regions

---

## 🛠️ Tech Stack

### 📱 Mobile App

- **React Native** (Expo → Bare workflow)
- **TypeScript**
- **Tailwind CSS** for styling

### 🧠 Offline AI

- **llama.cpp** (native C++ integration)
- Quantized GGUF models (CPU-friendly)

### 💾 Storage

- AsyncStorage
- SQLite
- Local JSON datasets

### 🔄 Local Sync

- **Flask LAN server**
- Device-to-device sync over Wi‑Fi

### 🌍 Internationalization

- JSON-based i18n system
- Easy language expansion

---

## 📂 Project Structure

```
offklass/
├── android/              # Native Android + llama.cpp integration
├── ios/                  # iOS (future parity)
├── src/
│   ├── components/       # Flashcards, quizzes, UI blocks
│   ├── screens/          # Lessons, quizzes, AI tutor screens
│   ├── lang/             # Multilingual JSON files
│   ├── data/             # Offline curriculum & quiz data
│   └── assets/           # Videos, icons, static files
├── models/               # Offline LLM models (.gguf)
├── server/               # Flask-based local sync server
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

Place your quantized model :

```
TBD
```

inside:

```
android/app/src/main/assets/models/
```

The model is loaded through **native llama.cpp bindings**.

---

## 🌍 Supported Languages

- English
- Hindi
- Urdu
- Nepali
- Bangla

*(More planned as JSON packs)*

---

## 🗺️ Roadmap

### ✅ Completed

- Offline video playback
- Flashcards & quizzes
- Multilingual system
- Local-first storage

### 🔄 In Progress

- Offline AI tutor (local LLM)
- LAN-based device sync

### 🔜 Planned

- More grades (3–11)
- Science, English, Social Studies
- Teacher / Admin dashboard
- Analytics (fully offline)
- NGO / school deployment mode

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

## 👤 Author

**Parth Patel**\
Software Systems Student — University of Regina\
Founder and Lead Developer, **Offklass** | Enactus Regina

**Saumin Bhagatwala**\
Software System Development - University Of Regina\
Backend DevOps, **Offklass** | Enactus Regina

---

## 🌟 Impact & Vision

🎯 **Problem**: Millions of students lack reliable internet access.

💡 **Solution**: A fully offline, AI-powered learning system.

🌍 **Impact**:

- Supports **SDG 4 – Quality Education**    
- Reduces digital inequality
- Enables modern learning anywhere

---

⭐ If you believe in **accessible education**, consider starring the repo and sharing Offklass.





