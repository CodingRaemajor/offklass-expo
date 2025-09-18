# 📚 Offklass  

> **AI-powered, offline-first learning platform for Grades 3–11**  
A multilingual app that empowers students to learn anywhere, anytime — even without the internet.  

---

## 📖 Overview  
**Offklass** is a modern **educational technology platform** designed for students in **Grades 3 to 11**.  
It combines **offline video lessons, flashcards, quizzes, and an AI tutor chatbot** into one seamless app, while supporting **multiple languages** to reach learners globally.  

✨ **Why Offklass?**  
- ✅ **Grades 3–11**: Comprehensive curriculum coverage  
- 🌍 **Multilingual**: English, Hindi, Urdu, Nepali, Bangla (with more coming soon)  
- 📦 **Offline-first**: Videos, flashcards, quizzes, and AI chatbot work without internet  
- 🧠 **AI Tutor**: Integrated **offline LLM** (Phi-2 via llama.cpp) for instant help  
- 🎥 **Video Lessons**: Preloaded & interactive for visual learning  
- 📝 **Flashcards & Quizzes**: Reinforce concepts and track progress  
- ⚡ **Lightweight & Scalable**: Optimized for **low-end devices & rural access**  
- 🔄 **Local Sync**: Share updates across devices with **Wi-Fi + Flask server**  

---

## 🛠️ Tech Stack  
- **Mobile App:** React Native (Expo → Bare workflow)  
- **UI Framework:** Tailwind CSS + ShadCN components  
- **Backend / Sync:** Flask (local server for LAN sync)  
- **Offline AI:** llama.cpp + Phi-2 (quantized model)  
- **Storage:** AsyncStorage + SQLite + local JSON  
- **Multilingual System:** i18n with JSON-based translations  

---

## 📂 Project Structure  
```
offklass/
├── android/              # Android native integration
├── ios/                  # iOS native integration
├── src/                  # React Native codebase
│   ├── components/       # Flashcards, quizzes, UI
│   ├── screens/          # Lessons, quizzes, AI tutor
│   ├── lang/             # Multilingual JSON files
│   └── assets/           # Videos, icons, static files
├── models/               # Offline LLM models (phi-2.gguf)
├── server/               # Local Flask sync server
└── README.md             # Documentation
```

---

## 🚀 Getting Started  

### 1️⃣ Clone the repo  
```bash
git clone https://github.com/CodingRaemajor/Offklass.git
cd Offklass
```

### 2️⃣ Install dependencies  
```bash
npm install   # or yarn install
```

### 3️⃣ Run the app  
```bash
npx expo run:android   # for Android
npx expo run:ios       # for iOS
```

### 4️⃣ Offline AI Setup  
Place the quantized model (e.g., `phi-2.Q4_K_M.gguf`) inside:  
```
android/app/src/main/assets/models/
```
The app loads this model via **native llama.cpp integration**.  

---

## 🌍 Supported Languages  
- English  
- Hindi  
- Urdu  
- Nepali  
- Bangla  
*(…more coming soon)*  

---

## 📊 Roadmap  
- ✅ Flashcards & Quiz system  
- ✅ Offline video integration  
- ✅ Multilingual system  
- 🔄 AI Tutor (local LLM)  
- 🔄 Cross-device sync via Flask server  
- 🔜 Extended subjects (Science, English, Social Studies, etc.)  
- 🔜 Teacher/Admin dashboard  

---

## 🤝 Contributing  
Contributions are welcome!  

1. Fork the repository  
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)  
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)  
4. Push to branch (`git push origin feature/AmazingFeature`)  
5. Open a Pull Request  

---

## 👤 Author  
**Parth Patel** (Enactus @ University of Regina)  

---

## 🌟 Support  
If you like this project, please star ⭐ the repository and share it with others who can benefit from accessible learning tools.  

---

⚡ Question: Do you also want me to **add a “For Enactus / Hackathon Pitch” section** at the bottom (like *Impact, Scalability, Why Offklass matters*), so it doubles as both README + pitch material?
