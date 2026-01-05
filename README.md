# ☯️ HarmonyName

> **Discover the Chinese Name That Chooses You**  
> A bridge between 5,000 years of Chinese wisdom and modern AI technology.

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![OpenAI](https://img.shields.io/badge/AI-OpenAI_GPT--4o--mini-green?logo=openai)](https://openai.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Solution Architecture](#-solution-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
- [Technical Highlights](#-technical-highlights)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**HarmonyName** is an AI-native web application that generates authentic, culturally meaningful Chinese names by combining traditional Chinese metaphysics (BaZi/Four Pillars of Destiny) with modern AI technology. Unlike standard translation tools that often produce awkward or culturally inappropriate names, HarmonyName uses a **Hybrid Logic Engine** to ensure every generated name is:

- ✅ **Culturally Authentic** - Sourced from classical Chinese poetry (Tang, Song dynasties)
- ✅ **Astrologically Balanced** - Calculated using traditional BaZi algorithms
- ✅ **Phonetically Harmonious** - Optimized for pronunciation and aesthetic appeal
- ✅ **Semantically Meaningful** - Each character carries profound cultural significance

---

## 🔍 Problem Statement

### The Challenge

Finding an authentic Chinese name is notoriously difficult for non-Chinese speakers. Common issues include:

1. **Translation Failures**: Direct translations often result in awkward or meaningless combinations
2. **Cultural Misalignment**: Names that sound good but lack cultural depth or carry unintended meanings
3. **Astrological Ignorance**: Traditional Chinese naming considers birth charts (BaZi) and Five Elements (WuXing), which most tools ignore
4. **Lack of Authenticity**: Generated names don't reference classical literature, making them feel "artificial"

### Our Solution

HarmonyName solves this by implementing a **two-layer hybrid system**:

1. **Deterministic Layer** (Local, Fast): Calculates BaZi using astronomical algorithms, analyzes Five Elements balance, and determines favorable elements
2. **Generative Layer** (AI-Powered): Uses RAG (Retrieval-Augmented Generation) to find relevant classical poetry, then generates names that strictly follow the balance theory

---

## 🏗️ Solution Architecture

### Hybrid Logic Flow

```
User Input (Birth Date/Time/Location)
    ↓
[Deterministic Layer]
    ├─ BaZi Calculation (lunar-javascript)
    ├─ Five Elements Analysis (Custom Algorithm)
    ├─ Strength Analysis (Weak/Strong/Balanced)
    └─ Favourable Elements Identification
    ↓
[Context Retrieval]
    ├─ RAG Search (OpenAI Embeddings + Cosine Similarity)
    └─ Classical Poetry Retrieval (Tang/Song/Shijing)
    ↓
[Generative Layer]
    ├─ Prompt Engineering (Context Injection)
    ├─ LLM Generation (GPT-4o-mini with Structured Output)
    └─ Name Validation & Formatting
    ↓
Result: 3 Culturally Authentic Names with Full Analysis
```

### Key Design Decisions

#### 1. **Fuzzy Time Handling**

Traditional BaZi requires exact birth time for 100% accuracy, but many users don't know their exact birth minute.

**Solution**: Implemented a "Fuzzy Time" system where users can:

- Select a 2-hour block (Chinese Shichen/时辰)
- Choose "Unknown" for approximate calculations
- System calculates based on first 3 pillars (Year, Month, Day) → **75% accuracy** with lower barrier to entry

**Implementation**: `calculateBazi()` in `src/lib/bazi.ts` dynamically adjusts calculations based on time availability.

#### 2. **True Solar Time Calculation**

BaZi requires accurate solar time based on geographic location, not just timezone offset.

**Solution**: Implemented `calculateTrueSolarTime()` that:

- Accounts for longitude-based time correction
- Converts local time to Beijing time for pillar calculation
- Uses true solar time for hour pillar determination

**Technical Details**:

- Standard meridian calculation: `(timezoneOffset / 60) * 15`
- Longitude correction: `(longitude - standardMeridian) * 4 minutes`
- Separate handling for Year/Month (Beijing time) vs Hour (True Solar Time)

#### 3. **Explicit vs. Implicit Logic**

Instead of relying on opaque third-party libraries for Five Elements mapping, we implemented a **custom dictionary mapping** in `src/lib/bazi.ts`.

**Benefits**:

- Type safety (TypeScript interfaces)
- Predictable behavior (no runtime surprises)
- Easy debugging and maintenance
- Full control over edge cases

#### 4. **RAG-Enhanced Generation**

To ensure names are sourced from authentic classical texts, we implemented a RAG system:

**Process**:

1. Generate embeddings for user's favorable elements using `text-embedding-3-small`
2. Search pre-computed poem embeddings using cosine similarity
3. Inject top 5 relevant poems into LLM context
4. LLM extracts characters directly from provided poems

**Result**: Every generated name can be traced back to its source poem with line-by-line citation.

---

## ✨ Key Features

### 🔮 BaZi & Five Elements Analysis

- **Accurate Calculation**: Uses `lunar-javascript` for solar-to-lunar conversion
- **Strength Analysis**: Determines if Day Master is Weak, Strong, or Balanced
- **Element Balance**: Visual representation of Five Elements distribution
- **Favourable Elements**: Identifies which elements to incorporate in names

### 🧠 AI-Powered Naming

- **RAG-Enhanced**: Retrieves relevant classical poetry before generation
- **Structured Output**: Uses OpenAI's JSON mode for consistent response format
- **Cultural Authenticity**: Names sourced from Tang/Song poetry, Shijing, and idioms
- **Balance Theory Compliance**: Strictly follows Five Elements balance requirements

### 🛡️ Robust Error Handling

- **Graceful Degradation**: Handles unknown birth time with fuzzy logic
- **API Fallbacks**: Continues with internal knowledge if RAG search fails
- **User-Friendly Messages**: Clear error messages for different failure scenarios
- **Type Safety**: Full TypeScript coverage prevents runtime errors

### 🎨 Modern UI/UX

- **Minimalist Design**: Ink-wash inspired aesthetic with Tailwind CSS
- **Responsive Layout**: Mobile-first design with smooth animations
- **Interactive Elements**:
  - City search with autocomplete (Open-Meteo API)
  - Surname search with pinyin support
  - Text-to-Speech for name pronunciation (Web Speech API)
- **Visual Feedback**: Loading states, error messages, and success animations

### 🌍 Geographic Support

- **City Search**: Integrates with Open-Meteo Geocoding API
- **Timezone Handling**: Automatic timezone detection and conversion
- **True Solar Time**: Accurate calculations based on longitude

### 🎤 Text-to-Speech

- **Native Implementation**: Uses browser's Web Speech API
- **Chinese Voice Selection**: Automatically selects best Chinese female voice
- **Pronunciation Accuracy**: Optimized pitch and rate for clarity

---

## 🛠️ Tech Stack

### Core Framework

- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe development
- **[React 19](https://react.dev/)** - UI library

### Styling

- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Lora Font](https://fonts.google.com/specimen/Lora)** - Google Fonts for serif typography
- **Custom CSS Animations** - Fade-in, slide-in effects

### AI & ML

- **[OpenAI API](https://openai.com/api/)**
  - `gpt-4o-mini` - Name generation with structured JSON output
  - `text-embedding-3-small` - Semantic search for RAG
- **[compute-cosine-similarity](https://www.npmjs.com/package/compute-cosine-similarity)** - Vector similarity calculation

### Core Algorithms

- **[lunar-javascript](https://www.npmjs.com/package/lunar-javascript)** - Solar-to-Lunar conversion and BaZi calculation
- **Custom BaZi Engine** - Five Elements mapping, strength analysis, favorable element identification

### External APIs

- **[Open-Meteo Geocoding API](https://open-meteo.com/)** - City search and location data

### Development Tools

- **ESLint** - Code linting
- **TypeScript Strict Mode** - Enhanced type checking

---

## 🏛️ System Architecture

### Directory Structure

```
harmony-name/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Landing page
│   │   ├── app/
│   │   │   └── page.tsx              # Main application (form + results)
│   │   ├── api/
│   │   │   └── generate/
│   │   │       └── route.ts           # AI orchestration endpoint
│   │   ├── layout.tsx                # Root layout with fonts
│   │   └── globals.css               # Global styles
│   │
│   ├── lib/                          # Core business logic (pure functions)
│   │   ├── bazi.ts                   # BaZi calculation engine
│   │   ├── retriever.ts              # RAG search implementation
│   │   ├── surnames.ts               # Surname database & utilities
│   │   ├── tts.ts                    # Text-to-Speech utilities
│   │   └── poems-db.json             # Pre-computed poem embeddings
│   │
│   └── data/                         # Static data files
│       ├── shijing.json              # Classic of Poetry
│       ├── tang.json                 # Tang Dynasty poetry
│       └── song.json                 # Song Dynasty poetry
│
├── public/                           # Static assets
│   ├── logo.png
│   ├── hero-bg.png
│   └── ...
│
├── scripts/                          # Build & utility scripts
│   ├── generate-embeddings.ts        # Generate poem embeddings
│   └── build-library.ts
│
├── mcp/                              # Model Context Protocol server
│   └── server.ts                     # MCP server implementation
│
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

### Separation of Concerns

The project follows a clear **layered architecture**:

1. **Presentation Layer** (`src/app/`)

   - Client components for UI
   - Server components for data fetching
   - API routes for backend logic

2. **Business Logic Layer** (`src/lib/`)

   - Pure functions (no side effects)
   - Deterministic calculations
   - Reusable utilities

3. **Data Layer** (`src/data/`, `src/lib/poems-db.json`)
   - Static JSON files
   - Pre-computed embeddings
   - Surname database

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** or **yarn** or **pnpm**
- **OpenAI API Key** (for name generation)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/harmony-name.git
   cd harmony-name
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

### Generating Poem Embeddings (Optional)

If you want to regenerate the poem embeddings database:

```bash
npm run generate-embeddings
```

---

## 💡 Technical Highlights

### 1. **Hybrid Deterministic + Generative Architecture**

Unlike pure AI solutions, HarmonyName combines:

- **Fast, local calculations** (BaZi, Five Elements) → Deterministic, reliable
- **Creative AI generation** (Name creation) → Flexible, culturally rich

This hybrid approach ensures both **accuracy** and **authenticity**.

### 2. **RAG Implementation**

```typescript
// Simplified RAG flow
const queryEmbedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: query,
});

const scoredPoems = poemsDb.map((poem) => ({
  ...poem,
  score: cosineSimilarity(queryEmbedding, poem.embedding),
}));

const topPoems = scoredPoems.sort((a, b) => b.score - a.score).slice(0, 5);
```

**Benefits**:

- Names are traceable to source material
- Reduces AI hallucination
- Ensures cultural authenticity

### 3. **True Solar Time Calculation**

```typescript
function calculateTrueSolarTime(
  date: Date,
  hour: number,
  longitude: number,
  timezone: string
): Date {
  const standardMeridian = (timezoneOffset / 60) * 15;
  const longitudeDiff = longitude - standardMeridian;
  const correctionMins = longitudeDiff * 4;
  // ... implementation
}
```

This ensures accurate BaZi calculations regardless of user's geographic location.

### 4. **Type-Safe Five Elements Mapping**

Instead of string-based lookups, we use TypeScript interfaces:

```typescript
export const GAN_WUXING: Record<string, string> = {
  甲: "Wood",
  乙: "Wood",
  丙: "Fire",
  丁: "Fire",
  // ... full mapping
};
```

This prevents runtime errors and provides IntelliSense support.

### 5. **Structured AI Output**

Using OpenAI's JSON mode ensures consistent response format:

```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  response_format: { type: "json_object" },
  // ...
});
```

---

## 📚 API Documentation

### POST `/api/generate`

Generates Chinese names based on BaZi analysis.

**Request Body**:

```typescript
{
  gender: "male" | "female";
  dayMaster: string;              // e.g., "Wood", "Fire"
  strength: "Weak" | "Strong" | "Balanced";
  favourableElements: string[];   // e.g., ["Water", "Metal"]
  avoidElements: string[];
  surnamePreference: "auto" | "specified";
  specifiedSurname?: string;       // e.g., "张"
  recommendedNameLength: string;   // e.g., "2 characters"
}
```

**Response**:

```typescript
{
  names: [
    {
      hanzi: string;               // e.g., "张清流"
      pinyin: string;              // e.g., "Zhāng Qīngliú"
      poeticMeaning: string;        // English translation
      culturalHeritage: {
        source: string;            // e.g., "Tang Poem 《...》 by ..."
        original: string;           // Original Chinese text
        translation: string;       // English translation
      };
      anatomy: [
        {
          char: string;
          meaning: string;
          type: "Surname" | "Given Name";
          element: string;
        }
      ];
      masterComment: string;
    }
  ]
}
```

**Error Responses**:

- `500` - Server configuration error (missing API key)
- `500` - AI service unavailable
- `500` - Invalid request format

---

## 🗺️ Roadmap

### ✅ Completed (MVP)

- [x] BaZi calculation engine
- [x] Five Elements analysis
- [x] AI-powered name generation
- [x] RAG implementation
- [x] City search integration
- [x] Text-to-Speech
- [x] Responsive UI

### 🚧 In Progress

- [ ] Database integration (PostgreSQL/AWS RDS)
- [ ] User history & saved names
- [ ] PDF report generation

### 🔮 Planned

- [ ] Surname analysis for existing Chinese surnames
- [ ] Payment integration (Stripe)
- [ ] Multi-language support
- [ ] Advanced BaZi analysis (Ten Gods, Day Master relationships)
- [ ] MCP (Model Context Protocol) server expansion
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

Contributions are welcome! This project follows best practices for:

- **Type Safety**: Full TypeScript coverage
- **Code Style**: ESLint configuration
- **Architecture**: Clear separation of concerns
- **Documentation**: Inline comments and README

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas for Contribution

- **Algorithm Improvements**: Enhance BaZi calculation accuracy
- **UI/UX**: Improve user experience and accessibility
- **Performance**: Optimize RAG search, reduce API calls
- **Documentation**: Expand API docs, add code examples
- **Testing**: Add unit tests, integration tests

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **lunar-javascript** - For accurate solar-to-lunar conversion
- **OpenAI** - For powerful AI capabilities
- **Classical Chinese Poetry** - Tang, Song, and Shijing collections
- **Traditional BaZi Masters** - For the wisdom of Five Elements theory

---

## 📧 Contact

For questions, suggestions, or collaboration opportunities, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, TypeScript, and OpenAI**
