# 🎨 Design System Setup Guide
**Call Center Agent — Next.js 14 + TypeScript + Tailwind CSS**

---

## 1. Project Setup

```bash
npx create-next-app@14 call-center-agent \
  --typescript --tailwind --eslint --app --src-dir

cd call-center-agent
npm install clsx tailwind-merge
```

---

## 2. Install Google Fonts (Space Grotesk + Inter)

In `app/layout.tsx`:

```tsx
import { Space_Grotesk, Inter } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-headline",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

---

## 3. File Placement

```
call-center-agent/
├── app/
│   ├── globals.css          ← paste globals.css here
│   └── layout.tsx
├── tailwind.config.ts       ← paste tailwind.config.ts here
├── lib/
│   └── utils.ts             ← add cn() helper below
└── components/
    └── ui/
        ├── Button.tsx        ← paste Button.tsx here
        └── ui-components.tsx ← paste ui-components.tsx here
        └── design-tokens.ts  ← paste design-tokens.ts here
```

---

## 4. Add the `cn()` helper

Create `lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 5. Usage Examples

### Buttons (all 4 Stitch variants)
```tsx
import { Button } from "@/components/ui/Button";

<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="inverted">Inverted</Button>
<Button variant="outlined">Outlined</Button>
```

### Status dot
```tsx
import { StatusDot } from "@/components/ui/ui-components";

<StatusDot status="online" showLabel />
<StatusDot status="busy"   showLabel />
```

### Progress bars (3 color bars from Stitch)
```tsx
import { ProgressBar } from "@/components/ui/ui-components";

<ProgressBar value={72} color="primary"   label="Call Handled" showValue />
<ProgressBar value={45} color="secondary" label="Avg Handle Time" showValue />
<ProgressBar value={88} color="tertiary"  label="CSAT Score" showValue />
```

### Search
```tsx
import { SearchInput } from "@/components/ui/ui-components";

const [q, setQ] = useState("");
<SearchInput
  placeholder="Search..."
  value={q}
  onChange={e => setQ(e.target.value)}
  onClear={() => setQ("")}
/>
```

### Cards
```tsx
import { Card, StatCard } from "@/components/ui/ui-components";

<Card hover>
  <p>Any content</p>
</Card>

<StatCard
  label="Total Calls Today"
  value="1,284"
  change="12% vs yesterday"
  trend="up"
  accentColor="primary"
/>
```

---

## 6. Design Tokens Reference

| Token | Value |
|---|---|
| Primary | `#6366F1` |
| Secondary | `#D946EF` |
| Tertiary | `#F59E0B` |
| Background | `#0B0C10` |
| Card surface | `#141418` |
| Headline font | Space Grotesk |
| Body font | Inter |

Import tokens in any file:
```ts
import tokens from "@/components/ui/design-tokens";
// tokens.colors.primary.DEFAULT → "#6366F1"
```

---

