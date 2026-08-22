---
name: coach-johnson-design-system
description: Apply the approved Coach Johnson Realty color system and visual constraints when designing, implementing, or reviewing any public, authentication, tenant, agent, or admin interface in this repository.
---

# Coach Johnson Design System

Use this skill with the relevant implementation or review skill. It overrides generic palette recommendations for this product. Preserve the exact brand colors unless the user explicitly approves a new system.

## Color system

Follow a 60/30/10 distribution:

- 60% white and warm neutral: `#FFFFFF`, `#F6F8F7`
- 30% ink neutrals: `#0D1211`, `#2C3532`, `#5B6663`
- Up to 10% Forest: `#0B4D3A`, `#0F6B4F`
- Brass stays below 2% and is not part of the primary action hierarchy.

Brand tokens:

| Role | Value | Use |
| --- | --- | --- |
| Brand dark | `#06291F` | Navigation, footer, dark brand panels |
| Forest 700 | `#0B4D3A` | Primary hover, deep brand accents |
| Forest 600 | `#0F6B4F` | Primary CTA, active controls, focus emphasis |
| Heading | `#0D1211` | Headings and highest-emphasis text |
| Body | `#2C3532` | Body copy |
| Meta | `#5B6663` | Secondary text; do not use below accessible sizes |
| Canvas | `#F6F8F7` | Application and marketing background |
| Surface | `#FFFFFF` | Cards, forms, sheets, dialogs |
| Line | `#D6DEDA` | Borders and dividers |
| Premium | `#B68A2C` | Small verified or premium marks only |
| Premium text | `#8A6318` | Accessible brass-family text on light surfaces |
| Warning | `#8F5D14` | Warning text and icons |
| Danger | `#B42318` | Errors, destructive actions, overdue states |
| Information | `#1859BA` | Informational status that requires a distinct hue |

Do not add mint or additional brand greens. `#0B4D3A` and `#0F6B4F` are the only two green values in the brand tier.

## Action hierarchy

- Use `#0F6B4F` for the single dominant CTA on a screen. Its hover state is `#0B4D3A`.
- Keep secondary actions neutral or outlined. Avoid two competing filled Forest buttons in the same decision area.
- Never use brass for buttons or ordinary text on white.
- Red is reserved for destructive, error, and overdue states. Do not use it decoratively.
- Do not use saturated blue, teal, purple, or gold as alternate brand colors.

## Photography and surfaces

- Property photography supplies the visual color. Never tint listing photos.
- Do not place colored overlays or gradients on listing images.
- Do not use gradients on cards.
- Prefer white surfaces, restrained borders, and quiet shadows over decorative color blocks.
- Preserve natural photo color and sufficient image space on all viewport sizes.

## Dark mode

Use these exact foundation values:

| Role | Value |
| --- | --- |
| Background | `#0B100E` |
| Surface | `#141B18` |
| Line | `#253029` |
| Primary | `#2FA37A` |
| Text | `#E6EBE8` |

Dark mode must preserve the same hierarchy and semantic meaning as light mode. Do not turn the interface into a green-tinted monochrome.

## Review checklist

Before handing off UI work, verify:

1. The exact tokens are used through shared variables rather than scattered near-match colors.
2. Each screen has one obvious primary action.
3. Brass appears only for verified or premium meaning and remains below 2%.
4. Photos are untinted and cards contain no gradients.
5. Light and dark modes meet WCAG AA for normal text.
6. Desktop, tablet, and mobile layouts retain hierarchy without horizontal overflow.
7. Semantic colors are not repurposed as decoration.

The repository root `DESIGN.md` contains the broader product design rationale. Read it when making system-level, cross-page, or component-library decisions.
