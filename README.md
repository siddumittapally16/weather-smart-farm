# FarmGuard AI Assistant

Update my existing FarmGuard AI agricultural weather dashboard.

IMPORTANT:

Do NOT rebuild the entire application from scratch.

Do NOT remove or break any existing features, pages, components, styling, weather cards, hourly forecast, farming recommendations, safety alerts, location search, or responsive layout.

I want to ADD an intelligent AI chatbox and improve the weather-update system.

==================================================

1. FARMGUARD AI CHATBOX

==================================================

Add a modern floating AI chat assistant to the bottom-right corner of the application.

Name:

"FarmGuard AI"

Subtitle:

"Your Smart Agricultural Assistant"

The chatbox should look professional, clean, modern, and suitable for farmers.

Features:

- Floating circular AI button at bottom-right.

- Clicking it opens the chat window.

- Clicking again minimizes it.

- Chat window should be responsive on desktop, tablet, and mobile.

- Smooth open/close animation.

- Do not cover important dashboard controls.

- Allow the user to type questions.

- Press Enter to send.

- Show a loading/typing indicator while AI is responding.

- Clearly distinguish user messages and FarmGuard AI messages.

- Add timestamps to messages.

- Include a clear chat button.

- Include a close/minimize button.

Example welcome message:

"Hello! I'm FarmGuard AI 🌱

I can help you make smarter farming decisions using current weather conditions, forecasts, crop information, irrigation conditions, spraying conditions, and farm safety data."

Add quick suggestion buttons:

"Should I irrigate now?"

"Is it safe to spray?"

"Will it rain today?"

"What is the best time to harvest?"

"Is the wind safe for spraying?"

"Explain today's weather"

"What should I do on my farm today?"

==================================================

2. GEMINI AI INTEGRATION

==================================================

Use Google Gemini as the AI reasoning engine for FarmGuard AI.

Use the existing Gemini service if the project already contains one.

If a Gemini service already exists, extend it instead of creating duplicate services.

The AI should receive the latest available weather information as context.

The context sent to Gemini should include:

- Current location

- Latitude

- Longitude

- Current temperature

- Feels-like temperature

- Minimum temperature

- Maximum temperature

- Humidity

- Dew point

- Rain probability

- Rain amount

- Wind speed

- Wind direction

- Wind gusts

- UV index

- ET / evapotranspiration if available

- Current weather condition

- Hourly forecast

- Daily forecast

- Farming recommendations

- Safety alerts

- Best time for irrigation

- Best time for spraying

- Best time for harvesting

- Best time for field work

- Crop focus if available

Gemini should NOT invent weather information.

If a value is unavailable, Gemini must say:

"Weather data is currently unavailable for this value."

Never generate fake temperature, rainfall, wind, humidity, or forecast values.

==================================================

3. WEATHER UPDATE SYSTEM

==================================================

Make the weather system update frequently.

Use the configured weather API for REAL weather data.

IMPORTANT:

Gemini should be used for AI interpretation and agricultural recommendations.

Do NOT treat Gemini as the authoritative source for raw real-time weather measurements.

The weather API should provide the raw weather data.

Gemini should analyze the latest weather data and explain what it means for farmers.

Create a weather refresh mechanism.

Automatically refresh weather data periodically while the application is open.

Default refresh interval:

10 minutes.

Allow the architecture to easily change this interval later.

Also provide a manual "Refresh Weather" button.

When refreshing:

1. Fetch the latest weather data.

2. Update the current weather card.

3. Update the metric cards.

4. Update the hourly forecast.

5. Update safety alerts.

6. Update farming recommendations.

7. Update best-time activities.

8. Send the latest weather context to Gemini.

9. Update the FarmGuard AI agricultural analysis.

Display the last successful update time.

Example:

"Weather updated 2 minutes ago"

When an update is occurring:

"Updating weather..."

Do not show fake loading values after real weather data is already available.

==================================================

4. GEMINI AGRICULTURAL REASONING

==================================================

FarmGuard AI should behave like an agricultural decision-support assistant.

The AI should answer questions based on the current weather and agricultural context.

Examples:

User:

"Can I spray pesticides now?"

AI should consider:

- wind speed

- wind gusts

- rain probability

- humidity

- temperature

- forecast

- spraying safety

Then answer something like:

"Current wind conditions are suitable for spraying, but check the product label before application. Rain probability is low during the next few hours."

User:

"Should I irrigate now?"

AI should consider:

- temperature

- humidity

- rain forecast

- evapotranspiration

- upcoming precipitation

- time of day

User:

"Will it rain today?"

AI should use the latest forecast data available from the weather API.

User:

"What should I do on my farm today?"

AI should provide a concise prioritized list:

1. Irrigation

2. Spraying

3. Harvesting

4. Field work

5. Weather risks

==================================================

5. LOCATION AWARENESS

==================================================

The AI chatbox must automatically use the currently selected FarmGuard location.

For example:

Current location:

Fresno, California

The AI should know that the user is currently viewing Fresno weather.

If the user changes location to:

Punjab

or

Telangana

or

Andhra Pradesh

or

Maharashtra

or

Karnataka

the AI context must automatically change to that location.

Do NOT hard-code Fresno.

==================================================

6. CHAT API ARCHITECTURE

==================================================

Do NOT expose the Gemini API key in frontend React code.

Use a secure backend/serverless function for Gemini requests.

If Lovable/Supabase backend functions are available, use a secure server-side function such as:

/functions/gemini-chat

The frontend should send:

{

  message,

  weatherContext,

  location,

  cropFocus

}

The backend should communicate with Gemini securely.

Store the Gemini API key in environment/secrets.

Never put the API key directly inside:

React components

JavaScript frontend files

HTML

CSS

GitHub-visible code

==================================================

7. WEATHER SERVICE

==================================================

Keep the existing weatherService architecture.

Make sure fetchWeatherData() always returns a consistent object.

Use a structure similar to:

{

  location: {

    name,

    country,

    latitude,

    longitude,

    cropFocus

  },

  current: {

    temperature,

    feelsLike,

    humidity,

    dewPoint,

    windSpeed,

    windDirection,

    windGust,

    rainProbability,

    precipitation,

    uvIndex,

    condition,

    high,

    low

  },

  hourly: [],

  daily: [],

  safetyAlerts: [],

  recommendations: [],

  bestTimeActivities: []

}

Do not allow undefined values to appear in the UI.

Never display:

undefined°C

undefined km/h

undefined%

undefined mm

Instead display:

"--"

when data is unavailable.

==================================================

8. HOURLY FORECAST

==================================================

Fix the existing hourly forecast so that it uses actual weather API data.

Do NOT use permanently hard-coded weather values such as:

30°C

31°C

32°C

unless the API is unavailable and a clearly labeled demo mode is being used.

The hourly forecast should contain:

- Time

- Weather condition

- Temperature

- Rain probability

- Precipitation

- Wind speed

- Wind direction

- Humidity

- Farm activity suitability

Example:

15:00

Partly Cloudy

30°C

Rain 10%

Wind 10 km/h

Humidity 55%

Good for farm work

==================================================

9. NO WEATHER DATA AVAILABLE PROBLEM

==================================================

Fix the current issue where the dashboard displays:

"No weather data available

Please select an agricultural location."

even when a default agricultural location is available.

On application startup:

Automatically load a default agricultural location.

Use:

Fresno, California

as the default location if no location has been selected.

The dashboard should immediately attempt to fetch weather data.

The user should NOT have to manually select a location just to see weather.

If the API fails, show a useful error message instead of pretending the weather data does not exist.

Example:

"Unable to retrieve live weather data. Please check your connection and try again."

Provide a Retry button.

==================================================

10. FARMING SAFETY

==================================================

The AI should clearly distinguish between:

Weather information

Agricultural recommendations

Safety warnings

For potentially dangerous agricultural activities, the AI should recommend following product labels and local agricultural guidance.

For pesticide spraying, fertilizer application, machinery operation, and extreme weather, prioritize safety.

==================================================

11. UI DESIGN

==================================================

Make the AI chatbox visually match the existing FarmGuard dashboard.

Use:

- Rounded corners

- Clean cards

- Green agricultural theme

- Subtle shadows

- Professional typography

- Good spacing

- Smooth animations

- Mobile responsive design

Do not make the chatbox excessively large.

Desktop:

Width: approximately 380px

Height: approximately 560px

Mobile:

Width: calc(100vw - 24px)

Maximum width: 420px

Position:

bottom: 20px

right: 20px

Ensure the chatbox has a high z-index.

==================================================

12. AI RESPONSE STYLE

==================================================

FarmGuard AI should be:

- concise

- practical

- farmer-friendly

- easy to understand

- location-aware

- weather-aware

Avoid overly technical explanations unless requested.

Use simple agricultural language.

Example:

"🌱 Irrigation:

Rain probability is low for the next 6 hours and temperatures are increasing. Early morning irrigation would reduce evaporation."

==================================================

13. CHAT MEMORY

==================================================

During the current browser session, preserve the conversation while the user remains on the page.

When the user changes location, update the weather context used for future answers.

Do not send unnecessary old weather data to Gemini.

Always prioritize the newest weather data.

==================================================

14. ERROR HANDLING

==================================================

If Gemini is unavailable:

"FarmGuard AI is temporarily unavailable. You can still use the live weather dashboard."

The weather dashboard must continue working even if Gemini fails.

If the weather API fails:

Keep the last successful weather data visible if available.

Show:

"Weather update unavailable. Showing the last successful update."

Do not replace working weather data with empty "--" values unnecessarily.

==================================================

15. FILE STRUCTURE

==================================================

Use a clean structure similar to:

src/

  components/

    AIChatBox.jsx

    AIChatBox.css

    Navbar.jsx

    LocationSearch.jsx

    CurrentWeatherCard.jsx

    MetricsGrid.jsx

    HourlyForecast.jsx

    FarmingRecommendations.jsx

    SafetyAlerts.jsx

    BestTimeActivities.jsx

  services/

    weatherService.js

    geminiService.js

  App.jsx

If the project uses a different existing structure, follow the existing structure rather than unnecessarily moving files.

==================================================

16. IMPORTANT FINAL REQUIREMENTS

==================================================

Before finishing:

- Make sure the project compiles.

- Fix all React syntax errors.

- Fix all missing CSS imports.

- Fix all undefined weather values.

- Make sure HourlyForecast receives the weather data from App.jsx.

- Make sure the default location loads automatically.

- Make sure weather refresh works.

- Make sure Gemini chat works.

- Make sure Gemini does not expose the API key.

- Make sure the AI chatbox is visible.

- Make sure mobile layout works.

- Do not break existing FarmGuard components.

- Do not create duplicate weather services.

- Do not hard-code fake weather data as live data.

Most importantly:

FarmGuard should use the WEATHER API for real weather measurements and GEMINI for intelligent agricultural interpretation.

The AI chatbox should always answer using the latest weather information currently displayed on the FarmGuard dashboard.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://weather-smart-farm.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9c451702-250f-44f7-9c8a-31adda3edb9f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
