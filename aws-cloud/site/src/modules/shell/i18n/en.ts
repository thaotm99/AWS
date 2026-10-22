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
  toc: {
    label: "Lesson contents",
    title: "In this lesson",
    progress: "Reading progress",
    jump: "to jump",
  },
  donate: {
    title: "Buy me a coffee",
    body: "AWS Thực Chiến is a personal project and completely free. If a lesson helped you, you can buy me a coffee to keep new lessons coming. It is entirely optional; every lesson stays fully open to you.",
    bank: "Bank",
    account: "Account number",
    holder: "Account holder",
    note: "Transfer note",
    copy: "Copy",
    copied: "Copied ✓",
    hint: "Leave the amount blank and give what you like. Thank you for learning with AWS Thực Chiến!",
    scan: "Scan with your banking app; the note is prefilled",
  },
  roadmap: {
    quiz: "Quiz",
    quizCount: "{n} questions",
    title: "Study path",
    progress: "{done} of {total} lessons completed",
    note: "Bars on the right: how important this is when you build on AWS.",
    ready: "Lesson ready",
    soon: "Coming soon",
    done: "Done",
  },
};
