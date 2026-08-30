---
description: "Brand assets shipped by the 888clinic design system (logos, icons, illustrations, photography, fonts, videos) with exact import paths. Read before adding any logo, icon, illustration, image, video, or font to the app: use these real assets instead of placeholders, stock photos, or generated images."
---

# 888clinic — Assets

These files are copied into `src/design-system/{slug}/assets/` in this project — never generate, placeholder, or substitute an asset that exists here.

Raw files import directly, e.g. `import logo from "@/design-system/{slug}/assets/logos/logo.svg"`.
R2 pointer files (`.asset.json`) are imported as JSON — use the `url` property, e.g. `import hero from "@/design-system/{slug}/assets/hero.png.asset.json"` then `<img src={hero.url} />`.
The full machine-readable catalog lives in this library's `design-system.json` (`assets` array).

## Logos

- `@/design-system/{slug}/assets/logo.jpg.asset.json` (jpg, R2 pointer)

## Videos

- `@/design-system/{slug}/assets/videos/888clinic-mali-promo-vertical.mp4.asset.json` (mp4, R2 pointer)

## Images

- `@/design-system/{slug}/assets/ai-scan.jpg` (jpg)
- `@/design-system/{slug}/assets/dr-mali-robot.jpg` (jpg)
- `@/design-system/{slug}/assets/filler/filler-0.webp.asset.json` (webp, R2 pointer)
- `@/design-system/{slug}/assets/filler/filler-1.webp.asset.json` (webp, R2 pointer)
- `@/design-system/{slug}/assets/filler/filler-2.webp.asset.json` (webp, R2 pointer)
- `@/design-system/{slug}/assets/filler/filler-3.webp.asset.json` (webp, R2 pointer)
- `@/design-system/{slug}/assets/filler/filler-4.webp.asset.json` (webp, R2 pointer)
- `@/design-system/{slug}/assets/filler/filler-5.webp.asset.json` (webp, R2 pointer)
- `@/design-system/{slug}/assets/filler/filler-6.webp.asset.json` (webp, R2 pointer)
- `@/design-system/{slug}/assets/hero-clinic.jpg` (jpg)
- `@/design-system/{slug}/assets/products.jpg` (jpg)

