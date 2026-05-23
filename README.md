# Tsukuyomi 🎬

**Tsukuyomi** is a premium, cinematic desktop application designed for an ad-free and immersive anime streaming experience. Built with **Electron**, **React**, and **TailwindCSS**, it offers a Netflix-style interface with a focus on speed, aesthetics, and user experience.

---

## ✨ Features

- 🍿 **Cinematic Experience**: A modern, dark-themed UI optimized for large screens and relaxed viewing.
- 📺 **Advanced Video Player**: Custom HLS player with quality selection, playback progress, and keyboard shortcuts.
- 👤 **Profile System**: Create multiple profiles with custom avatars and manage your personal favorites.
- 🔍 **Global Search**: Find your favorite anime across multiple providers (AnimeFLV, AnimeAV1, and more).
- 📦 **Modular Architecture**: Easily extensible source system to add new anime providers.
- 🚫 **Ad-Free**: Direct stream extraction to bypass intrusive ads and popups from source websites.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Recommended: v18 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/CrizzVc/AnimeWB.git
   cd AnimeWB
   ```

2. **Setup the Backend:**
   ```bash
   cd backend
   npm install
   node server.js
   ```

3. **Setup the Frontend (Electron App):**
   ```bash
   # In a new terminal
   cd frontend
   npm install
   npm run dev
   ```

4. release the app

```bash
# In a new terminal
cd frontend
npm run dist
```
---

## 🛠️ Technology Stack

- **Frontend**: [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [TailwindCSS](https://tailwindcss.com/)
- **Desktop Wrapper**: [Electron](https://www.electronjs.org/)
- **Backend**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/)
- **Scraping & Extraction**: [Axios](https://axios-http.com/), [Cheerio](https://cheerio.js.org/)
- **Streaming**: [hls.js](https://github.com/video-dev/hls.js/)

---

## 📁 Project Structure

```text
Tsukuyomi/
├── frontend/             # React + Electron Application
│   ├── electron/         # Electron main process & services
│   └── src/              # React frontend source code
├── backend/              # Node.js API for scraping and data
└── README.md             # Project documentation
```

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features or want to add a new anime source, feel free to open a Pull Request.

---

> [!TIP]
> Make sure to keep your `backend` server running while using the desktop app to ensure the latest content is always available.

---

Developed with ❤️ by [CrizzVc](https://github.com/CrizzVc)
