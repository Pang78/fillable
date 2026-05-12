## 2025-05-14 - [Aria labels for icon-only buttons]
**Learning:** Icon-only buttons or buttons with generic text like "Paste" (especially when adjacent to an input) benefit significantly from descriptive `aria-label` attributes to ensure screen reader users understand the specific action (e.g., "Paste URL from clipboard").
**Action:** Always check for `aria-label` or `title` on buttons that use icons as their primary visual indicator.

## 2025-05-14 - [Usability: Clipboard Integration]
**Learning:** In tools that require frequent copying/pasting of long strings (like URLs or IDs), providing a dedicated "Paste" button next to the input field significantly reduces friction and enhances the "magical" feel of the UX.
**Action:** Identify fields where users likely come from another tab with data in their clipboard and offer a one-click paste option.
