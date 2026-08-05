# Everest Color Palette & Design Tokens

## Overview
Everest uses OKLCH color space for perceptually uniform colors across Dark and Light themes.

---

## 🌙 Dark Theme (`.dark` / `[data-theme='dark']`)

### Layer System & Backgrounds
| Token | OKLCH / Value | Description |
| :--- | :--- | :--- |
| `--canvas` | `oklch(0.175 0.018 262)` | Deep desaturated navy canvas |
| `--island` | `oklch(0.225 0.02 262)` | Elevated panels & island containers |
| `--surface` | `oklch(0.275 0.022 262)` | Interactive elements & input backgrounds |
| `--surface-hover` | `oklch(0.315 0.024 262)` | Hover state background |
| `--bg-active` | `oklch(0.35 0.025 262)` | Active state background |

### Borders
| Token | OKLCH / Value | Description |
| :--- | :--- | :--- |
| `--border-primary` | `oklch(0.32 0.02 262)` | Primary subtle borders |
| `--border-secondary` | `oklch(0.36 0.02 262)` | Secondary borders |
| `--border-focus` | `oklch(0.63 0.19 277)` | Active focus outline border |

### Typography
| Token | OKLCH / Value | Description |
| :--- | :--- | :--- |
| `--text-primary` | `oklch(0.9 0.01 262)` | High contrast primary text |
| `--text-secondary` | `oklch(0.62 0.015 262)` | Secondary muted text |
| `--text-tertiary` | `oklch(0.5 0.015 262)` | Subtle placeholder text |
| `--text-inverse` | `oklch(0.175 0.018 262)` | Inverse dark text |

### Accent Colors
| Token | OKLCH / Value | Description |
| :--- | :--- | :--- |
| `--accent-primary` | `oklch(0.63 0.19 277)` | Indigo / Violet primary brand accent |
| `--accent-primary-hover` | `oklch(0.68 0.2 277)` | Primary accent hover |
| `--accent-secondary` | `oklch(0.32 0.06 277)` | Secondary subtle accent surface |
| `--accent-glow` | `rgba(99, 102, 241, 0.25)` | Glow shadow |

---

## ☀️ Light Theme (`[data-theme='light']`)

### Layer System & Backgrounds
| Token | OKLCH / Value | Description |
| :--- | :--- | :--- |
| `--canvas` | `oklch(0.945 0.008 265)` | Soft blue-gray app canvas |
| `--island` | `oklch(0.995 0.002 265)` | Near-white island background |
| `--surface` | `oklch(0.955 0.006 265)` | Interactive surface background |
| `--surface-hover` | `oklch(0.93 0.01 265)` | Hover state background |
| `--bg-active` | `oklch(0.91 0.012 265)` | Active state background |

### Borders
| Token | OKLCH / Value | Description |
| :--- | :--- | :--- |
| `--border-primary` | `oklch(0.9 0.008 265)` | Primary subtle borders |
| `--border-secondary` | `oklch(0.85 0.01 265)` | Secondary borders |
| `--border-focus` | `oklch(0.585 0.2 277)` | Active focus outline border |

### Typography
| Token | OKLCH / Value | Description |
| :--- | :--- | :--- |
| `--text-primary` | `oklch(0.28 0.03 265)` | Dark slate primary text |
| `--text-secondary` | `oklch(0.55 0.02 265)` | Secondary muted text |
| `--text-tertiary` | `oklch(0.65 0.02 265)` | Subtle placeholder text |
| `--text-inverse` | `oklch(0.995 0.002 265)` | Inverse white text |

### Accent Colors
| Token | OKLCH / Value | Description |
| :--- | :--- | :--- |
| `--accent-primary` | `oklch(0.585 0.2 277)` | Indigo / Violet primary brand accent |
| `--accent-primary-hover` | `oklch(0.52 0.2 277)` | Primary accent hover |
| `--accent-secondary` | `oklch(0.93 0.03 277)` | Secondary subtle accent surface |
| `--accent-glow` | `rgba(99, 102, 241, 0.12)` | Glow shadow |

---

## 📡 HTTP Methods & Status Indicators

| Indicator | Dark OKLCH | Light OKLCH | Visual Color |
| :--- | :--- | :--- | :--- |
| **GET / Success** | `oklch(0.7 0.15 155)` | `oklch(0.6 0.15 155)` | Emerald Green |
| **POST / Client Error** | `oklch(0.75 0.15 65)` | `oklch(0.65 0.15 65)` | Amber Orange |
| **PUT / Redirect** | `oklch(0.7 0.15 240)` | `oklch(0.55 0.15 240)` | Electric Blue |
| **PATCH** | `oklch(0.7 0.15 290)` | `oklch(0.55 0.15 290)` | Purple / Magenta |
| **DELETE / Server Error** | `oklch(0.65 0.19 25)` | `oklch(0.577 0.215 27)` | Crimson Red |
| **OPTIONS** | `oklch(0.7 0.12 210)` | `oklch(0.55 0.12 210)` | Cyan |
| **HEAD** | `oklch(0.7 0.12 280)` | `oklch(0.55 0.12 280)` | Violet |
