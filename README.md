# 📚 Offklass  

> **AI-powered, offline-first learning platform for Grades 3–11**  
A multilingual app that empowers students to learn anywhere, anytime — even without the internet.  

---

## 📖 Overview  
**Offklass** is a modern **educational technology platform** designed for students in **Grades 3 to 11**.  
It combines **offline video lessons, flashcards, quizzes, and an AI tutor chatbot** into one seamless app, while supporting **multiple languages** to reach learners globally.  

✨ **Why Offklass?**  
- ✅ **Grades 3–11**: Comprehensive curriculum coverage  
- 🌍 **Multilingual**: Supports multiple languages for inclusive learning  
- 📦 **Offline-first**: Access learning materials without internet connectivity  
- 🧠 **AI Tutor**: Instant help with math, science, and more via offline AI chatbot  
- 🎥 **Video Lessons**: Preloaded, interactive lessons for visual learning  
- 📝 **Flashcards & Quizzes**: Reinforce key concepts and track progress  
- ⚡ **Lightweight & Scalable**: Works on low-end devices and adapts to various contexts  

---

## 🛠️ Tech Stack  
- **Mobile App:** React Native (Expo → bare workflow)  
- **UI Framework:** Tailwind CSS + ShadCN components  
- **Backend / Sync:** Flask local server (Wi-Fi sync)  
- **Offline AI:** llama.cpp + Phi-2 (quantized model)  
- **Storage:** Local JSON, SQLite, AsyncStorage  
- **Multilingual System:** i18n + JSON-based translations  

---

## 📂 Project Structure  
offklass/
├── android/ # Android native integration
├── ios/ # iOS native integration
├── src/ # React Native codebase
│ ├── components/ # Flashcards, quizzes, UI
│ ├── screens/ # App pages
│ ├── lang/ # Multilingual JSON files
│ └── assets/ # Videos, icons, static files
├── models/ # Offline LLM models (phi-2.gguf)
├── server/ # Local Flask sync server
└── README.md # Documentation

---

## 🚀 Getting Started  

### 1️⃣ Clone the repo  
```bash
git clone https://github.com/CodingRaemajor/Offklass.git
cd Offklass
2️⃣ Install dependencies
bash
Copy code
npm install   # or yarn install
3️⃣ Run the app
bash
Copy code
npx expo run:android   # for Android
npx expo run:ios       # for iOS
4️⃣ Offline AI Setup
Place the quantized model (e.g., phi-2.Q4_K_M.gguf) inside:

swift
Copy code
android/app/src/main/assets/models/
The app will load this model via native llama.cpp integration.

🌍 Supported Languages
English

Hindi

Urdu

Nepali

Bangla

(…more coming soon)

📊 Roadmap
 Flashcards & Quiz system

 Offline video integration

 AI Tutor (local LLM)

 Multilingual support

 Cross-device sync

 Extended subject modules (Science, English, Social Studies, etc.)

 Teacher/Admin dashboard

🤝 Contributing
Contributions are welcome!

Fork the repository

Create your feature branch (git checkout -b feature/AmazingFeature)

Commit changes (git commit -m 'Add some AmazingFeature')

Push to branch (git push origin feature/AmazingFeature)

Open a Pull Request


👤 Author
Parth Patel (Enactus @U of R)

⭐ Support
If you like this project, please star ⭐ the repository and share it with others who can benefit from accessible learning tools.

---

⚡ Question: Do you also want me to **add a “For Enactus / Hackathon Pitch” section** at the bottom (like *Impact, Scalability, Why Offklass matters*), so it doubles as both README + pitch material?
