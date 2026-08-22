---
name: Coach Johnson Realty
description: A grounded residential service system built for clear decisions and dependable daily work.
colors:
  canvas: "#F6F8F7"
  surface: "#FFFFFF"
  ink: "#0D1211"
  body: "#2C3532"
  meta: "#5B6663"
  forest: "#0F6B4F"
  forest-deep: "#0B4D3A"
  brand-dark: "#06291F"
  line: "#D6DEDA"
  premium-brass: "#B68A2C"
  premium-text: "#8A6318"
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
    backgroundColor: "{colors.forest}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.forest-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "#EDF2F0"
    textColor: "{colors.body}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "44px"
---

# Design System: Coach Johnson Realty

## Overview

**Creative North Star: "The Clear Property Ledger"**

The interface is a restrained frame for homes and operational decisions. Public pages use decisive property imagery against neutral surfaces. Product pages use familiar navigation and measured density so residents, agents, and staff can act without relearning the interface.

The system is daylight-first because most visitors compare homes in natural light and most staff work during business hours. Dark mode remains a complete, quieter alternative for evening tenant use. It explicitly rejects generic AI landing pages, navy-and-gold luxury templates, decorative glassmorphism, fake metrics, and repeated card grids.

**Key Characteristics:**

- 85% neutral surfaces, near-black ink, and one locked Forest action hue.
- A single humanist sans family with optical hierarchy rather than decorative type pairing.
- Property photography carries emotion; interface chrome stays restrained.
- Mobile layouts prioritize one action and preserve full context through progressive disclosure.
- Motion is crisp, interruptible, and tied to feedback or spatial continuity.

## Colors

The palette follows the category's strongest product pattern: neutral interface chrome, one saturated brand hue, and photography carrying the emotional color.

### Primary

- **Forest 600 (`#0F6B4F`):** The only primary action and focus hue in light mode.
- **Forest 700 (`#0B4D3A`):** Hover, pressed, and high-contrast supporting state.

### Brand Support

- **Brand Dark (`#06291F`):** Public navigation, footer, and grounded brand panels.
- **Premium Brass (`#B68A2C`):** Verified or premium badges only, never buttons or ordinary text.
- **Premium Text (`#8A6318`):** Accessible brass-associated text on light surfaces.

### Neutral

- **Canvas (`#F6F8F7`):** 60% page foundation.
- **Surface (`#FFFFFF`):** Forms and grouped objects.
- **Ink (`#0D1211`):** Headings and highest-priority text.
- **Body (`#2C3532`):** Default prose and product labels.
- **Meta (`#5B6663`):** Secondary text at 5.58:1 against the canvas.
- **Line (`#D6DEDA`):** Quiet dividers and control borders.

### Named Rules

**The Two Greens Rule.** `#0F6B4F` and `#0B4D3A` are the only brand-tier greens. Do not add mint, sage, teal, or lime.

**The 60/30/10 Rule.** 60% white or canvas, 30% ink neutrals, and at most 10% Forest. Brass remains under 2%.

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
- **Primary:** Forest 600 with white text. One primary button per screen.
- **Hover / Focus:** Deepens one tone, preserves layout, and uses a visible two-layer focus ring.
- **Secondary / Ghost:** Neutral surfaces with Ink or Body text and a clear border when needed.
- **Press:** Immediate 0.98 scale response. Routine actions settle within 160ms.

### Chips

- **Style:** Compact pill with semantic text and a low-chroma fill.
- **State:** Selected filters use Forest with white text. Status chips always include readable text, never color alone.
- **Premium:** Brass is reserved for verified or premium status only.

### Cards / Containers

- **Corner Style:** Gently curved surfaces at 20px. Controls remain 12px.
- **Background:** White for true grouped objects; Canvas or open space for ordinary content.
- **Shadow Strategy:** Flat at rest, ambient lift only for interactive elevation.
- **Border:** One subtle Hairline border, never a colored side stripe.
- **Internal Padding:** 20-28px depending on density.

### Inputs / Fields

- **Style:** White fill, Line border, 12px radius, and a 44px minimum height.
- **Focus:** Forest border with an outer ring that remains visible in both themes.
- **Error / Disabled:** Error text appears below the field. Disabled state lowers contrast without removing the label.

### Navigation

Public navigation and footer use Brand Dark. Product navigation uses the same grounded sidebar above tablet width and a mobile header plus sheet below it. Current location is always visible through both text and shape.

### Property Preview

Property previews use real photography, price, address, and the minimum decision-making facts. The image and address form one linked target. Hover reveals depth without scaling surrounding layout.

## Do's and Don'ts

### Do:

- **Do** keep 44px touch targets, visible focus, sentence-case labels, and semantic HTML on every page.
- **Do** use Forest only for the primary action, current selection, focus, and clear state indicators.
- **Do** reserve brass for verified or premium badges.
- **Do** let one decisive image carry each public section.
- **Do** collapse complex grids to one clear mobile column below 768px.
- **Do** use skeleton, empty, error, and success states that match the final layout.
- **Do** respect reduced motion, reduced transparency, system color preference, and text zoom.

### Don't:

- **Don't** build generic AI landing pages with glowing gradients, fake dashboards, vague claims, or oversized slogans.
- **Don't** use navy-and-gold luxury real-estate styling or generic category blue.
- **Don't** tint listing photos or place gradients over cards.
- **Don't** use decorative glassmorphism, repeated equal card grids, gradient text, or colored side stripes.
- **Don't** use startup-style names, AI terminology, robot icons, fake metrics, or invented customer proof.
- **Don't** introduce mint, teal, sage, lime, emoji icons, or multiple icon families.
- **Don't** animate routine product navigation or keyboard-driven actions.
