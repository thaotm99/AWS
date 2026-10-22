import type { Messages } from "../../../core/i18n/types";
import type { vi } from "./vi";

export const en: Messages<typeof vi> = {
  nav: {
    main: "Main",
    theory: "Concepts",
    scenarios: "Scenarios",
    practice: "Practice",
    roadmap: "Study path",
    language: "Language",
    soon: "{page} is coming soon.",
  },
  theme: {
    toDark: "Switch to dark mode",
    toLight: "Switch to light mode",
  },
  roadmap: {
    title: "SAA-C03 study path",
    note: "Number on the right: questions in the 6 practice tests. ~ means estimated.",
    ready: "Lesson ready",
    soon: "Coming soon",
    done: "Done",
  },
};
