---
name: Coach Johnson Realty
description: A grounded residential service system built for clear decisions and dependable daily work.
colors:
  limestone: "oklch(0.976 0.012 78)"
  paper: "oklch(0.995 0.005 78)"
  pine-ink: "oklch(0.230 0.024 159)"
  evergreen: "oklch(0.370 0.075 158)"
  evergreen-deep: "oklch(0.300 0.064 158)"
  clay: "oklch(0.560 0.145 42)"
  clay-deep: "oklch(0.490 0.133 42)"
  mist: "oklch(0.940 0.015 78)"
  stone: "oklch(0.480 0.025 159)"
  hairline: "oklch(0.860 0.020 78)"
typography:
  display:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 5.75rem)"
    fontWeight: 650
    lineHeight: 0.98
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.5rem)"
    fontWeight: 650
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 450
    lineHeight: 1.65
  label:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: 1.2
rounded:
  control: "12px"
  surface: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "clamp(64px, 9vw, 128px)"
components:
  button-primary:
    backgroundColor: "{colors.clay}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.clay-deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.pine-ink}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    height: "44px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.pine-ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "44px"
---

# Design System: Coach Johnson Realty

## Overview

**Creative North Star: "The Well-Kept Threshold"**

The interface should feel like arriving at a well-cared-for home: composed, warm, and immediately understandable. Public pages use generous asymmetry and decisive property imagery. Product surfaces use familiar navigation and a measured information rhythm so tenants, agents, and staff can work without relearning the interface.

The system is daylight-first because most visitors compare homes in natural light and most staff work during business hours. Dark mode remains a complete, quieter alternative for evening tenant use. It explicitly rejects generic AI landing pages, navy-and-gold luxury templates, decorative glassmorphism, fake metrics, and repeated card grids.

**Key Characteristics:**

- Warm limestone foundations with evergreen structure and one clay action color.
- A single humanist sans family with optical hierarchy rather than decorative type pairing.
- Property photography carries emotion; interface chrome stays restrained.
- Mobile layouts prioritize one action and preserve full context through progressive disclosure.
- Motion is crisp, interruptible, and tied to feedback or spatial continuity.

## Colors

The palette is drawn from limestone, mature trees, and fired brick. It feels residential without becoming rustic.

### Primary

- **Evergreen:** Structural navigation, selected states, and confident supporting actions.
- **Deep Evergreen:** Hover and pressed states where stronger contrast is needed.

### Secondary

- **Burnt Clay:** The single action accent for primary calls to action, urgent next steps, and meaningful focus.
- **Deep Clay:** Hover and pressed states for primary actions.

### Neutral

- **Limestone:** Main page background with enough warmth to avoid clinical white.
- **Paper:** Raised or input surfaces. Never pure white.
- **Pine Ink:** Primary text and dark-mode foundation. Never pure black.
- **Mist:** Quiet grouped regions and hover fills.
- **Stone:** Secondary text that remains comfortably above contrast minimums.
- **Hairline:** Dividers and control borders, used sparingly.

### Named Rules

**The One Hearth Rule.** Burnt Clay is the only saturated action accent. Do not introduce purple, cyan, gold, or rainbow accents for decoration.

**The Property First Rule.** Color supports listings and tasks. It never competes with property photography or status meaning.

## Typography

**Display Font:** Manrope (with system sans fallbacks)  
**Body Font:** Manrope (with system sans fallbacks)

**Character:** Clear, architectural, and quietly human. Public pages use wider weight contrast and tighter display tracking. Product screens use a compact fixed scale and calm label weight.

### Hierarchy

- **Display:** Variable 650 weight with tight tracking. Reserved for one public-page message per route.
- **Headline:** Variable 650 weight for major section and page titles.
- **Title:** 1.125rem at 650 for property, workflow, and grouped-content titles.
- **Body:** 1rem at 450 with 1.65 leading and a 70-character maximum for prose.
- **Label:** 0.8125rem at 650. Sentence case by default; uppercase only for compact metadata that benefits from scanning.

### Named Rules

**The One Voice Rule.** The same family spans brand and product. Hierarchy comes from scale, weight, spacing, and placement rather than mixing decorative fonts.

## Elevation

The system is flat by default. Separation comes from tonal layering, negative space, and restrained hairlines. Shadows appear only where a surface truly floats, such as a menu, dialog, mobile navigation sheet, or hovered property preview.

### Shadow Vocabulary

- **Ambient Low:** A wide, warm, low-opacity shadow for floating navigation and menus.
- **Ambient Lift:** A slightly deeper warm shadow for dialogs and interactive property previews.

### Named Rules

**The Earned Lift Rule.** If a surface does not move above another surface or block interaction, it does not receive a shadow.

## Components

### Buttons

- **Shape:** Full pill for actions, with a 44px minimum height.
- **Primary:** Burnt Clay with Paper text. Reserved for the clearest next action.
- **Hover / Focus:** Deepens one tone, preserves layout, and uses a visible two-layer focus ring.
- **Secondary / Ghost:** Evergreen or Pine Ink text on Mist or transparent backgrounds with a clear border when needed.
- **Press:** Immediate 0.98 scale response. Routine actions settle within 160ms.

### Chips

- **Style:** Compact pill with semantic text and a low-chroma fill.
- **State:** Selected filters use Evergreen with Paper text. Status chips always include readable text, never color alone.

### Cards / Containers

- **Corner Style:** Gently curved surfaces at 20px. Controls remain 12px.
- **Background:** Paper for true grouped objects; Limestone or open space for ordinary content.
- **Shadow Strategy:** Flat at rest, ambient lift only for interactive elevation.
- **Border:** One subtle Hairline border, never a colored side stripe.
- **Internal Padding:** 20-28px depending on density.

### Inputs / Fields

- **Style:** Paper fill, Hairline border, 12px radius, and a 44px minimum height.
- **Focus:** Evergreen border with an outer ring that remains visible in both themes.
- **Error / Disabled:** Error text appears below the field. Disabled state lowers contrast without removing the label.

### Navigation

Public navigation is a compact floating bar on wide screens and a full-width, directly labeled sheet on mobile. Product navigation uses a stable sidebar above tablet width and a bottom-safe mobile header plus sheet below it. Current location is always visible through both text and shape.

### Property Preview

Property previews use real photography, price, address, and the minimum decision-making facts. The image and address form one linked target. Hover reveals depth without scaling surrounding layout.

## Do's and Don'ts

### Do:

- **Do** keep 44px touch targets, visible focus, sentence-case labels, and semantic HTML on every page.
- **Do** use Burnt Clay only for primary actions and meaningful attention.
- **Do** let one decisive image carry each public section.
- **Do** collapse complex grids to one clear mobile column below 768px.
- **Do** use skeleton, empty, error, and success states that match the final layout.
- **Do** respect reduced motion, reduced transparency, system color preference, and text zoom.

### Don't:

- **Don't** build generic AI landing pages with glowing gradients, fake dashboards, vague claims, or oversized slogans.
- **Don't** use navy-and-gold luxury real-estate styling.
- **Don't** use decorative glassmorphism, repeated equal card grids, gradient text, or colored side stripes.
- **Don't** use startup-style names, AI terminology, robot icons, fake metrics, or invented customer proof.
- **Don't** use pure black, pure white, emoji icons, or multiple icon families.
- **Don't** animate routine product navigation or keyboard-driven actions.
