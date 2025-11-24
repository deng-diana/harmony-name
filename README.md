# ☯️ HarmonyName (中文取名助手)

![Next.js](https://img.shields.io/badge/Next.js-15.0-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![OpenAI](https://img.shields.io/badge/AI-OpenAI_GPT--4o-green) ![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38bdf8)

> **Discover the Chinese Name That Chooses You.**
>
> A bridge between ancient Chinese wisdom (BaZi/Four Pillars) and modern AI technology.

## 📖 Introduction

**HarmonyName** is an AI-native application designed to help non-Chinese speakers find authentic, culturally meaningful Chinese names.

Unlike standard translation tools that often result in "Tattoo Fails" or awkward meanings, HarmonyName uses a **Hybrid Logic Engine**:
1.  **Deterministic Layer:** Calculates the user's "BaZi" (Destiny Chart) and Five Elements (WuXing) balance using traditional astronomical algorithms.
2.  **Generative Layer:** Uses LLMs (OpenAI) to creatively generate names that compensate for the user's missing elements, ensuring balance, poetic meaning, and phonetic harmony.

## ✨ Key Features

*   **🔮 BaZi & Five Elements Analysis:** Accurate calculation of the user's energy chart based on birth date and time.
*   **🧠 AI-Powered Naming:** Generates names that strictly follow the "Balance Theory" (e.g., if you lack Water, the name will contain Water-related characters).
*   **🛡️ Smart Fallbacks:** 
    *   Handles "Unknown Birth Time" edge cases gracefully using a fuzzy time logic.
    *   Robust error handling for API failures.
*   **🎨 Zen UI/UX:** A minimalist, ink-wash style interface built with Tailwind CSS.

## 🛠️ Tech Stack

*   **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS v4
*   **AI Integration:** OpenAI API (GPT-4o-mini) with Structured JSON Output
*   **Core Algorithm:** `lunar-javascript` (for Solar-to-Lunar conversion)
*   **Deployment:** Vercel (Planned) / AWS (Planned)

## 🏗️ System Architecture

The project follows a clear **Separation of Concerns** design pattern:

harmony-name/
├── app/ # Frontend & API Routes (Next.js App Router)
│ ├── page.tsx # UI Components (Client Side)
│ └── api/ # Backend Logic (Server Side)
│ └── generate/ # AI Orchestration Layer
├── lib/ # Core Business Logic (Pure Functions)
│ └── bazi.ts # The "Engine": BaZi calculation & mapping
└── public/ # Static Assets

### Hybrid Logic Flow
1.  **User Input** -> 2. **Algorithmic Calculation** (Local, Fast, Deterministic) -> 3. **Prompt Engineering** (Context Injection) -> 4. **LLM Generation** (Cloud, Creative).

## 🚀 Getting Started

Follow these steps to run the project locally:

💡 Product Decisions (Why I built it this way)
1. The "Time of Birth" Trade-off:
Traditional BaZi requires exact birth time for 100% accuracy. However, many users do not know their exact birth minute.
Decision: I implemented a "Fuzzy Time" system. Users can select a 2-hour block (Chinese Shichen) or simply choose "Unknown".
Implementation: The calculateBazi function dynamically adjusts calculations. If time is unknown, it calculates based on the first 3 pillars (Year, Month, Day), which provides 75% accuracy and lowers the barrier to entry for users.
2. Explicit vs. Implicit Logic:
Instead of relying on third-party libraries for "Five Elements" mapping (which can be opaque), I implemented a custom dictionary mapping in src/lib/bazi.ts. This ensures type safety and prevents runtime errors during critical calculations.
🔜 Roadmap

MVP: BaZi Calculation & AI Naming

Database Integration (AWS RDS / Postgres) to save user history

"Surname Analysis" for users with existing Chinese surnames

PDF Report Generation

Stripe Payment Integration
🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

📄 License
This project is licensed under the MIT License.

这个 Readme 既展示了你的**代码能力**（Tech Stack, Architecture），又展示了你的**产品思考**（Product Decisions），非常适合用来面试！加油！