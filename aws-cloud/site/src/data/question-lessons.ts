// Build-time only (uses fs): which lesson part teaches each practice question, for the "Learn it again"
// links on the practice pages. A part's <Scene questions={[...]}> lists the practice-test questions it
// teaches; a question no part cites links to the overview of the lesson whose question set holds it.
// The practice-test references (examN_qM) are resolved here and never reach the browser.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LAYERS } from "./curriculum";
import { getCurriculum } from "./exam";
import { lessonParts } from "./lesson-parts";
import { practiceCatalog } from "../modules/practice/content/PracticeCatalog";
import type { Exam, LearnLink, Question } from "../modules/practice/domain/types";

const CERT = "saa-c03";
/** At most this many links per question; a question taught in several parts lists them in study order. */
const MAX_LINKS = 3;
const SCENE = /<Scene\s+id="([^"]+)"[^>]*?\bquestions=\{\[([^\]]*)\]\}/g;

let byQuestion: Map<string, LearnLink[]> | undefined;

function build(): Map<string, LearnLink[]> {
  const cert = practiceCatalog.getCertification(CERT);
  const examIdOf = new Map(cert.exams.map((e) => [e.number, e.id]));
  const questionId = (ref: string): string | undefined => {
    const m = /^exam(\d+)_q(\d+)$/.exec(ref);
    const examId = m && examIdOf.get(Number(m[1]));
    return examId ? practiceCatalog.getExam(CERT, examId).questions[Number(m![2]) - 1]?.id : undefined;
  };
  const concepts = getCurriculum().flatMap((l) => l.concepts);
  const map = new Map<string, LearnLink[]>();
  const add = (id: string, link: LearnLink) => {
    const list = map.get(id) ?? [];
    if (list.length < MAX_LINKS && !list.some((l) => l.url === link.url)) list.push(link);
    map.set(id, list);
  };
  const head = (s: string) => s.split(": ")[0];

  for (const lesson of LAYERS.flatMap((l) => l.ids)) {
    const file = resolve(process.cwd(), "src/content/concepts", `${lesson}.mdx`);
    if (!existsSync(file)) continue;
    const concept = concepts.find((c) => c.id === lesson)!;
    const parts = lessonParts(lesson);
    for (const [, sceneId, refs] of readFileSync(file, "utf8").matchAll(SCENE)) {
      const part = parts.find((p) => p.id === sceneId);
      if (!part) continue;
      for (const ref of refs.match(/exam\d+_q\d+/g) ?? []) {
        const id = questionId(ref);
        if (id) add(id, { url: `/concepts/${lesson}/${part.slug}/`, title: { vi: head(part.title.vi), en: head(part.title.en) }, lesson: { vi: concept.title, en: concept.titleEn } });
      }
    }
  }
  // Questions no part cites: the overview of the lesson whose question set (list_qa.md) holds them.
  for (const concept of concepts) {
    let topic: Exam;
    try {
      topic = practiceCatalog.getTopic(CERT, concept.id);
    } catch {
      continue;
    }
    for (const q of topic.questions) {
      if (!map.has(q.id)) add(q.id, { url: `/concepts/${concept.id}/`, title: { vi: concept.title, en: concept.titleEn }, lesson: { vi: concept.title, en: concept.titleEn } });
    }
  }
  return map;
}

export function learnLinks(questionId: string): LearnLink[] {
  byQuestion ??= build();
  return byQuestion.get(questionId) ?? [];
}

/** The question set with each question's "Learn it again" links attached. */
export function withLearnLinks(exam: Exam): Exam {
  return { ...exam, questions: exam.questions.map((q): Question => ({ ...q, learn: learnLinks(q.id) })) };
}
