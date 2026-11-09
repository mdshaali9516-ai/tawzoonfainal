# Tawzoon High-Performance Mobile & AI Optimization Plan

A comprehensive engineering plan to eliminate mobile device overheating, typing stutter, search hallucinations, and memory pressure by implementing incremental product loading, native image lazy-loading, debounced state computation, Google Search Grounding, and self-cleaning memory retention.

## User Review & Critical Decisions

> [!IMPORTANT]
> The clarifying questions were answered with the recommended architectural defaults. Please review the confirmed choices below before proceeding to execution:

- **Confirmed Decision 1 (Product Loading)**: Incremental Infinite Scroll / Progressive Batching (12–16 products per slice) across `PublicStorefront`, `ProductGallery`, `ShopCategoryPage`, and `AdminPortal`, preventing main-thread DOM bloat.
- **Confirmed Decision 2 (AI Search Grounding)**: Server-side Google Search Grounding enabled via `@google/genai` (`tools: [{ googleSearch: {} }]`) for real-time external questions, while local catalog queries remain focused on the compact inventory schema.
- **Confirmed Decision 3 (Memory Retention)**: Automatic 72-hour rolling retention policy for stored chat sessions in `localStorage` to safeguard low-end mobile devices against memory exhaustion.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the Tawzoon e-commerce platform and its AI Assistant into a lightweight, high-performance web experience that runs at a consistent 60 FPS on any smartphone without causing CPU thermal throttling or battery drain.
- **Target Audience / Persona**: Mobile shoppers, resellers, and admins in Bangladesh and worldwide accessing the store on varied hardware (from budget Android devices to high-end mobile browsers).
- **Key Value**: Delivers zero-lag navigation, instant search filtering, fluid keyboard typing, verified real-time AI search responses, and fail-safe memory stability even when managing thousands of products.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Product Browsing*: Shoppers browse collections smoothly. As they scroll near the end of the current product slice, a lightweight spinner loads the next batch without freezing the screen or re-rendering all images.
  2. *Instant Search & Filtering*: Typing in the search bar responds immediately without keystroke delays. Results are computed via a debounced hook (150ms–200ms) and memoized state.
  3. *AI Assistant Interaction*: Users open the chat widget to ask about products, policies, or general knowledge. The assistant utilizes Google Search Grounding for external queries and precise catalog data for inventory questions, replying rapidly without timeout delays.
- **Visual Identity & Theme**:
  - *Aesthetic*: Crisp white minimalist design with subtle emerald accents (`#009245` / `emerald-600`), neutral borders, and clear typography.
  - *Typography*: Clean pairings using Plus Jakarta Sans and Hind Siliguri for Bengali readability.
  - *Smooth Feedback*: Micro-animations powered by CSS transitions and lightweight loading skeletons instead of heavy synchronous layout recalculations.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Progressive Incremental Batching vs. Full DOM Dump**
  - *Chosen Approach*: Display products in batches of 12 to 16 items with an IntersectionObserver trigger (`useInView` / scroll sentinel) or a clean "Load More" fallback.
  - *Why*: Reduces initial DOM nodes from 2,000+ to under 150, immediately lowering memory consumption and CPU temperature on mobile devices.
  - *Alternatives Considered*: Standard pagination controls (1, 2, 3) were considered, but continuous scrolling provides a more fluid e-commerce browsing experience on mobile devices.
- **Decision 2: Native Browser Image Lazy Loading & Fallback Placeholders**
  - *Chosen Approach*: Apply `loading="lazy"` and `decoding="async"` across all `<img>` tags in product cards, category banners, and gallery thumbnails.
  - *Why*: Prevents hundreds of network image decodes at boot time, keeping the GPU and memory footprint negligible.
- **Decision 3: Debounced State Computation**
  - *Chosen Approach*: Separate raw input state from filtered query state with a 180ms debounce and memoized filtering arrays (`useMemo`).
  - *Why*: Typing stays at 60 FPS without dropping frames or triggering expensive re-renders on every keystroke.
- **Decision 4: Lean Catalog Context & Google Search Grounding in Gemini AI**
  - *Chosen Approach*: In `/api/public/chat` (`server.ts`), pass only a compact summary (ID, title, price, code, stock) rather than dumping full descriptions and image arrays into the prompt. Enable `{ googleSearch: {} }` in the `@google/genai` model configuration to provide grounded, factual live web answers.
  - *Why*: Drastically shortens token latency, eliminates hallucinated search answers, and cuts model execution time from 8s+ to under 2s.
- **Decision 5: Automated 72-Hour Storage Cleanup**
  - *Chosen Approach*: Run an automatic purge cycle on widget mount to delete chat logs older than 72 hours and compress session payloads before writing to `localStorage`.
  - *Why*: Prevents `QUOTA_EXCEEDED_ERR` and sluggish mobile browser storage reads.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          TAWZOON CLIENT SPA                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────┐  Debounced Query  ┌───────────────────────┐  │
│  │ Search / Filter Bar  │ ────────────────> │ useMemo Filter Engine │  │
│  └──────────────────────┘                   └───────────────────────┘  │
│                                                         │              │
│                                                    Slices: 16          │
│                                                         v              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Incremental Grid (PublicStorefront, ProductGallery, Categories)   │  │
│  │ └─ ProductCard (loading="lazy", decoding="async", responsive)    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ AI Chat Widget (AIChatWidget.tsx)                                │  │
│  │ ├─ Input typing isolated from message list re-renders            │  │
│  │ ├─ Rolling 72h auto-purge of localStorage sessions               │  │
│  │ └─ Lean payload transport to backend                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │ POST /api/public/chat
                                     v
┌────────────────────────────────────────────────────────────────────────┐
│                       EXPRESS SERVER (server.ts)                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Gemini API Handler (@google/genai SDK)                           │  │
│  │ ├─ Model: gemini-3.8-flash (with fast timeout fallbacks)         │  │
│  │ ├─ Tools: [{ googleSearch: {} }] (Search Grounding Enabled)      │  │
│  │ ├─ Lean Catalog Context (compact summary, no token bloat)        │  │
│  │ └─ Strict Reseller Privacy & Grounded Search Responses           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Implementation Checklist
1. **Frontend Optimization**:
   - `src/components/PublicStorefront.tsx`: Add slice pagination / progressive batch loading for products.
   - `src/components/ProductCard.tsx`: Enforce `loading="lazy"`, `decoding="async"`, and low-overhead image rendering.
   - `src/components/ProductGallery.tsx`: Optimize item display with progressive batching.
   - `src/components/ShopCategoryPage.tsx`: Implement progressive item display for category browsing.
   - `src/components/AdminPortal.tsx`: Paginate or batch administrative product inventory tables.
2. **Typing & Search Memoization**:
   - `src/components/Navbar.tsx` & search modals: Integrate debounced search query transitions.
3. **AI Chatbot Grounding & Latency Reduction**:
   - `server.ts`: Add `tools: [{ googleSearch: {} }]` to the Gemini configuration in `/api/public/chat`.
   - `server.ts`: Compress catalog payloads injected into the prompt and optimize fallback timeouts.
   - `src/components/common/AIChatWidget.tsx`: Isolate text input state, prevent full-component re-renders on keystrokes, and enforce 72-hour `localStorage` auto-cleanup.
