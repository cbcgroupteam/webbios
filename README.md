<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./.github/assets/logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="./.github/assets/logo-light.png">
    <img alt="WebbiOS Logo" src="./.github/assets/logo-light.png" height="80" style="margin-bottom: 20px;">
  </picture>
  <p><strong>WebbiOS | Next-Gen Business Growth Platform</strong></p>
  <p>Build websites, apps, and management systems on Cloudflare's edge network. Open source. Free forever. Deploy in seconds.</p>

  *Read this in other languages: [Tiếng Việt](README.vi.md).*

  <p>
    <a href="https://webbios.dev">Website</a> •
    <a href="https://docs.webbios.dev/">Documentation</a> •
    <a href="https://www.facebook.com/webbios.dev">Facebook Fanpage</a>
  </p>
</div>

> [!WARNING]
> **🚧 EARLY ALPHA / WORK IN PROGRESS 🚧**
> 
> WebbiOS is currently under heavy active development. To share this system with the community, we are refining the architecture and codebase. The core platform and essential applications are expected to be fully completed and reach a stable state by **August 25, 2026**.
> 
> At this stage, the codebase is unstable, features are incomplete, and documentation may be outdated. **Please do not use this in production yet.** Bug reports regarding incomplete features or installation issues may not be addressed until the official Beta release.

---

## 🚀 Overview

**WebbiOS started as an internal core engine to solve real business infrastructure pain points for CBC GROUP.** We needed a unified ecosystem to build diverse products—from corporate homepages and cross-border storefronts to internal CRMs, marketing automation, and complex ERP systems.

After witnessing the incredible stability, absolute performance, and zero infrastructure costs it delivered, we realized this was too powerful to keep to ourselves. We decided to release the core platform as open-source under the AGPLv3 license to empower the global developer community.

Today, **WebbiOS** is a Next-Gen Business Growth Platform. An open-source, edge-native operating system built entirely on Cloudflare to rapidly develop and scale high-performance business applications and enterprise systems with zero infrastructure management.

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

## 💎 The Platform

Built from the ground up for the Edge. Four independent pillars that together create the most powerful open-source business growth platform:

1. **The Kernel API**: The heart of WebbiOS. A headless API gateway running on Cloudflare Edge with D1 database and KV Cache.
2. **Universal Dashboard**: Your control plane. A ready-to-use admin panel with RBAC, Custom Domains, and Webhooks built-in.
3. **Themes**: The presentation layer. Load dynamic JSON-based storefronts. Customize everything with our visual Theme Builder.
4. **Apps**: The extensibility engine. Inject Micro-Frontends directly into your dashboard to expand business logic infinitely.

## ✨ Key Features

### Core Platform & Security
- **Role-Based Access Control**: Granular permissions. Control what every user can see and do.
- **Custom Domains & SSL**: Map domains instantly with automatic SSL provisioning.
- **API Keys Management**: Securely generate and manage API keys for system integrations.
- **1-Click OTA Updates**: Update the Core, Apps, and Themes instantly. Even on the Free tier.
- **Global Edge Network**: Deployed across 300+ cities worldwide for zero latency.
- **Auto-Scaling**: Handles traffic spikes effortlessly without manual intervention.

### Developer Experience
- **Serverless Database**: Powered by Cloudflare D1. Relational data without servers.
- **Edge Native Logic**: Run complex business logic directly on Cloudflare Workers.
- **Real-time Webhooks**: Subscribe to system events to trigger external workflows.
- **Micro-Frontends**: Load apps dynamically into the dashboard without bloating the core.
- **4-Tier Caching**: Advanced caching utilizing KV, Memory, and Edge cache.
- **Automated Bindings**: Connect to R2 storage and queues effortlessly.

### Commerce & Content
- **Universal Storefront**: Ready-to-use e-commerce templates optimized for conversion.
- **Built-in CMS**: Manage content, blogs, and pages with a powerful visual editor.
- **SEO Optimized**: Server-side rendering and dynamic meta tags for maximum visibility.
- **Omni-channel Ready**: Headless architecture lets you sell anywhere, on any device.
- **App/Theme Manager**: Install new capabilities from the marketplace with one click.
- **Global Multi-Language**: Comprehensive internationalization covering the Dashboard, App Store, and Settings in 11+ languages.

## 📦 Getting Started

### Prerequisites
- Node.js (v20+)
- pnpm (v9+)
- A Cloudflare account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/cbcgroupteam/webbios.git
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

Check the [Documentation](https://docs.webbios.dev) for detailed guides on how to initialize the database and deploy to Cloudflare.

## 🤝 Contributing

We welcome contributions from the community! Whether you want to fix a bug, improve documentation, or build a new feature, please check our [GitHub Issues](https://github.com/cbcgroupteam/webbios/issues) or create a Pull Request.

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

WebbiOS is open-source software licensed under the **AGPLv3**. See the `LICENSE` file for more details.
