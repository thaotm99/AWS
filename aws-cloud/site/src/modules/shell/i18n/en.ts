import type { Messages } from "../../../core/i18n/types";
import type { vi } from "./vi";

export const en: Messages<typeof vi> = {
  nav: {
    main: "Main",
    theory: "Concepts",
    scenarios: "Scenarios",
    practice: "Practice",
    roadmap: "Study path",
    menu: "Menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    language: "Language",
    soon: "{page} is coming soon.",
  },
  theme: {
    toDark: "Switch to dark mode",
    toLight: "Switch to light mode",
  },
  importance: {
    label: "Importance",
    core: "Core",
    important: "Important",
    supporting: "Supporting",
    coreHint: "Part of almost every system built on AWS",
    importantHint: "Used often in many architectures",
    supportingHint: "Used for specific needs",
  },
  roadmap: {
    title: "SAA-C03 study path",
    note: "Bars on the right: how important this is when you build on AWS.",
    ready: "Lesson ready",
    soon: "Coming soon",
    done: "Done",
  },
};
