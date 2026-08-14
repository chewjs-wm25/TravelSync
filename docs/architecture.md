# TravelSync System Architecture

This document provides a component breakdown and embedded **Mermaid.js** diagram for the **TravelSync** system architecture—a modern, serverless Next.js application deployed on Cloudflare's edge infrastructure.

---

## Architecture Overview

### 1. Edge & Security Layer (Tier 1)
* **Client**: User terminals and web browsers interacting via **HTTPS**.
* **Cloudflare Edge Network**: Serves as the ingress gateway providing **CDN, DDoS protection, WAF, Bot management, and Zero Trust** security mechanisms.

### 2. Next.js Fullstack Core (Tiers 2 & 3)
A unified serverless application execution runtime containing:
* **Presentation Layer (Tier 2)**: Built on **Next.js 15/16** utilizing Server-Side Rendering (SSR). Interacts directly with **MapTiler** for vector, satellite, and elevation map tiles.
* **Business Logic Layer (Tier 3)**: Manages core platform domains including **Auth, Itinerary, Route Planning, POI, Search, and Collaboration**. Integrates with **Google OAuth & Mail Services**.
* **Data Access Layer**: Handles data layer abstraction for **Cloudflare D1 queries** and **KV store access**.
* **Unified API Client Layer (`src/lib/api/`)**: Custom route handlers interfacing with downstream third-party APIs.

### 3. Database & Storage Layer (Tier 4)
* **Cloudflare D1**: Serverless SQL relational database hosting **16 core tables**.
* **Cloudflare KV**: Key-value data store used for **Sessions, Tokens, and Caching**.

### 4. External Services & APIs
* **MapTiler**: Map tile rendering (Vector, Satellite, Elevation).
* **Google OAuth / Email**: Authentication and notification emails.
* **data.gov.my**: Official government and municipal open data datasets.
* **OpenStreetMap**: Point of Interest (POI) geographic data.
* **OpenRouteService**: Route optimization and distance matrix operations (`v2/matrix`).

---

## Architecture Diagram (Mermaid.js)

```mermaid
graph LR
    %% Clients & Entry
    Client["Client<br/>(用户终端、浏览器)"] -->|HTTPS| HTTPS["HTTPS<br/>互联网协议栈"]
    HTTPS --> Network["Cloudflare 边缘网络 (Tier 1)<br/>CDN · DDoS · WAF · Bot · Zero Trust"]

    %% Application Container
    subgraph Core ["Next.js Fullstack Core (Tier 2 + 3)"]
        Presentation["Presentation 层 (Tier 2)<br/>Next.js 15/16 · SSR 预渲染页面"]
        Business["Business Logic 层 (Tier 3)<br/>认证 / 行程 / 规划 / POI / 搜索 / 协作"]
        DataAccess["Data Access 层<br/>D1 查询 · KV 访问"]
        ApiClient["统一 API 客户端层<br/>src/lib/api/ · route handlers"]

        Presentation --> Business
        Business --> DataAccess
        Business --> ApiClient
    end

    %% Ingress to App
    Network -->|HTTPS| Presentation

    %% Top External Services
    MapTiler["MapTiler<br/>地图瓦片 (矢量/卫星/高程)"] <-->|瓦片请求| Presentation
    GoogleAuth["Google OAuth / 邮件服务<br/>登录 / 通知邮件"] <-->|登录 / 发邮件| Business

    %% Storage (Tier 4)
    DataAccess --> CloudflareD1[("Cloudflare D1 (Tier 4)<br/>关系库 · 16 张表")]
    DataAccess --> CloudflareKV[("Cloudflare KV (Tier 4)<br/>Session / Token / 缓存")]

    %% Bottom External APIs
    ApiClient -.->|官方认证 / 接口| DataGov["data.gov.my<br/>官方认证 / 市政数据"]
    ApiClient -.->|POI 查询| OSM["OpenStreetMap<br/>POI 地图数据"]
    ApiClient -.->|路线 / v2/matrix| ORS["OpenRouteService<br/>路线 / v2/matrix"]

    %% Styling
    classDef external fill:#e2e8f0,stroke:#64748b,color:#0f172a;
    classDef security fill:#fef3c7,stroke:#d97706,color:#78350f;
    classDef cfEdge fill:#ffe4e6,stroke:#e11d48,color:#881337;
    classDef frontend fill:#cff4fc,stroke:#0891b2,color:#164e63;
    classDef backend fill:#d1fae5,stroke:#059669,color:#065f46;
    classDef database fill:#f3e8ff,stroke:#9333ea,color:#581c87;

    class Client,MapTiler,GoogleAuth,DataGov,OSM,ORS external;
    class HTTPS security;
    class Network cfEdge;
    class Presentation frontend;
    class Business,DataAccess,ApiClient backend;
    class CloudflareD1,CloudflareKV database;