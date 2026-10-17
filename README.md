# 🌾 FarmGuard AI — Smart Agricultural Weather & Advisory Dashboard

An intelligent agricultural weather monitoring and AI-powered advisory system that helps farmers make timely, data-driven decisions on spraying, irrigation, harvesting and pest control.

🌐 **Live Demo:** [weather-smart-farm.lovable.app](https://weather-smart-farm.lovable.app)

---

## 📌 About the Project

**FarmGuard AI** combines live weather data with local farming knowledge. Beyond a standard forecast, it analyzes field conditions — wind speed limits for spraying, overnight humidity for fungal blast risk, and rainfall outlook for irrigation — and gives practical advice matched to local seasons and crops.

## ✨ Key Features

- 🌦️ **Live Weather Monitoring** — temperature, wind, humidity and rain probability with a 12-hour forecast.
- 🤖 **FarmGuard AI Assistant** — floating chat assistant with regional crop knowledge (paddy, cotton, chilli, red gram, maize, turmeric in Telangana & Andhra Pradesh, and more).
- 🚜 **Agricultural Safety Logic** — spraying windows, irrigation timing and disease-risk alerts.
- 📍 **Location Awareness** — search any city; advice always uses the selected location.
- 🔄 **Auto-Refresh** — weather updates every 10 minutes, plus manual refresh and automatic retries.
- 🕒 **12-Hour Clock** — AM/PM times across the forecast and chat.
- 📱 **Mobile-Friendly Design** — works in the field or the office.

## 🛠️ Technologies Used

- **Frontend:** React 19, Tailwind CSS v4, Lucide Icons
- **Full-Stack Framework:** TanStack Start v1 & TanStack Router (TypeScript)
- **Weather Data:** Open-Meteo API (forecast + geocoding, no key required)
- **AI Engine:** Lovable AI Gateway (server-side; API key never exposed to the browser)
- **Platform:** Lovable

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ and npm (or bun)
- Git

### Installation

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd weather-smart-farm
npm install
npm run dev
```

The app runs at `http://localhost:8080`.

## 🌐 Live Deployment

- **Production:** [https://weather-smart-farm.lovable.app](https://weather-smart-farm.lovable.app)

## 👨‍💻 Developer

**Siddharthareddy Mittapally**

## 📄 License

This project is created for educational and agricultural development purposes.
