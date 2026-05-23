# 🌌 SynergyHub

**SynergyHub** is a next-generation workspace collaboration platform designed for modern teams. Built with bleeding-edge web technologies, it provides a seamless, real-time experience featuring advanced workspace isolation, instant communication, and a beautiful, high-performance interface.

## ✨ Key Features

- **Real-Time Data Sync:** Enjoy an instantaneous, unified experience with a WebSocket-powered architecture. Changes are reflected instantly across all connected clients.
- **Enterprise-Grade Security:** Utilizes PostgreSQL Row-Level Security (RLS) via Supabase to ensure complete tenant and data isolation between workspaces.
- **Dynamic Glassmorphism UI:** A meticulously crafted interface using Tailwind CSS v4 featuring a premium dark mode, immersive micro-animations, and fluid transitions.
- **Intelligent Workspaces:** Effortlessly create, switch, and manage workspaces, with built-in channels, boards, and comprehensive document management features.
- **Edge-Ready Performance:** Architected with TanStack Start and Vite, providing lightning-fast server-side rendering (SSR) and optimized for seamless deployment to edge networks like Cloudflare.

## 🛠️ Tech Stack

- **Framework:** React + TypeScript
- **Routing & SSR:** TanStack Start
- **Styling:** Tailwind CSS v4, Radix UI Primitives, Lucide Icons
- **Backend & Database:** Supabase (PostgreSQL)
- **Bundler:** Vite
- **Deployment:** Cloudflare Pages / Vercel

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js and `npm` installed.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sameerthawait/synergyhub.git
   cd synergyhub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173` to see the application in action.

## 👨‍💻 Author

Created by **SAMEER THAWAIT**
- GitHub: [sameerthawait](https://github.com/sameerthawait)
- LinkedIn: [Sameer Thawait](https://www.linkedin.com/in/sameer-thawait-47528a291)

## 📄 License
This project is open-source and available under the MIT License.
