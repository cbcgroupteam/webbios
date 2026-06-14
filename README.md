<div align="center">
  <h1>WebbiOS</h1>
  <p><strong>Next-Gen Business Growth Platform</strong></p>
  <p>Build websites, apps, and management systems on Cloudflare's edge network. Open source. Free forever. Deploy in seconds.</p>

  <p>
    <a href="https://webbios.dev">Website</a> •
    <a href="https://docs.webbios.dev">Documentation</a> •
    <a href="https://www.facebook.com/webbios.dev">Facebook Fanpage</a>
  </p>
</div>

---

## 🚀 Overview

**WebbiOS** is an open-source, edge-native operating system for modern web development built entirely on **Cloudflare**. It provides a foundational architecture to rapidly develop, deploy, and scale websites, headless commerce storefronts, and internal tools with zero infrastructure management.

By leveraging Cloudflare's massive global network, WebbiOS delivers **sub-50ms Time To First Byte (TTFB)** worldwide and is designed to operate at scale for $0 on Cloudflare's Free Tier.

## 🏗️ Architecture

WebbiOS is architected as a **Monorepo** (managed by `pnpm` and `Turborepo`) and follows a Micro-Frontend & Serverless microservices design pattern.

### Core Layers
1. **Core Kernel (Layer 1)**: The central nervous system of WebbiOS.
   - **`@webbios/api`**: A blazing-fast Cloudflare Worker built with [Hono](https://hono.dev/). Handles routing, authentication, RBAC, and business logic.
   - **`@webbios/db`**: Database ORM layer powered by [Drizzle ORM](https://orm.drizzle.team/), interacting natively with Cloudflare D1.
2. **Web Foundation (Layer 2)**: The UI & App ecosystem.
   - **`@webbios/dashboard`**: A Micro-Frontend dashboard built with Vite, React, and Tailwind CSS.
   - **`@webbios/storefront-engine`**: An edge-rendering storefront worker utilizing React 19 Server Streaming (`renderToReadableStream`) to render JSON-driven UI themes at the edge.
   - **`@webbios/storefront-ui`**: The component library for building modern, dark-mode optimized themes.
   - **`@webbios/ui`**: Internal UI components for the dashboard.
3. **Application SDKs**: 
   - **`@webbios/sdk`**: Strongly typed TypeScript SDK to interact with WebbiOS core services.

### Technologies
- **Compute**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Object Storage**: Cloudflare R2
- **Caching**: Cloudflare KV & Worker Cache API
- **Frameworks**: React 19, Vite, Hono, Tailwind CSS
- **Tooling**: TypeScript, pnpm, Turborepo

## ✨ Key Features

- **Edge Native**: 100% serverless, zero cold starts, deployed to 300+ cities globally.
- **Micro-Frontend Architecture**: Dynamically load applications inside the dashboard via Module Federation.
- **Universal Storefront Engine**: JSON-driven theme rendering using Edge SSR and streaming.
- **4-Tier Caching**: Advanced caching strategy (CDN -> Worker Cache -> KV -> D1) for maximum performance.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for users, API keys, and apps.
- **Zero Cost to Start**: Designed to run entirely within Cloudflare's generous free tier.

## 📦 Getting Started

### Prerequisites
- Node.js (v20+)
- pnpm (v9+)
- A Cloudflare account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/chieunt/webbios.git
   cd webbios
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment:**
   Copy `.env.example` to `.env.dev` and fill in your Cloudflare credentials.

4. **Run Locally:**
   ```bash
   pnpm run dev
   ```

Check the [Documentation](https://docs.webbios.dev/docs) for detailed guides on how to initialize the database and deploy to Cloudflare.

## 🤝 Contributing

We welcome contributions from the community! Whether you want to fix a bug, improve documentation, or build a new feature, please check our [GitHub Issues](https://github.com/chieunt/webbios/issues) or create a Pull Request.

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

WebbiOS is open-source software licensed under the **AGPLv3**. See the `LICENSE` file for more details.
