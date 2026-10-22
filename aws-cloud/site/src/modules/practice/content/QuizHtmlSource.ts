// Build-time only (uses fs). Never import from a client component.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CertificationId, ContentLocale, Exam, Question } from "../domain/types";
import { ExamSource } from "./ExamSource";
import { HtmlSanitizer } from "./HtmlSanitizer";

/** solution-architect-aws/translations/<locale>/practice-test-N.json, keyed by question id. */
type Translations = Record<string, { prompt: string; answers: string[]; explanation: string }>;

/**
 * File names of the exported SAA-C03 practice tests, e.g.
 * "001 Quiz Practice Test #1 - AWS Certified Solutions Architect Associate.html".
 * A re-downloaded copy ("… (1).html") still matches, so it is reported as a duplicate instead of ignored.
 * First capture group is the exam number.
 */
export const SAA_PRACTICE_TEST_FILE =
  /^\d{3} Quiz Practice Test #(\d+)\s*-\s*AWS Certified Solutions Architect Associate(?: \(\d+\))?\.html$/;

interface RawQuestion {
  id: number;
  assessment_type: "multiple-choice" | "multi-select";
  correct_response: string[];
  section?: string;
  prompt: { question: string; answers: string[]; explanation: string };
}

/**
 * Reads exported quiz pages ("001 Quiz Practice Test #1 - ….html"), which embed
 * the whole test as `const quizData = {...};`.
 */
export class QuizHtmlSource extends ExamSource {
  private readonly sanitizer = new HtmlSanitizer();

  constructor(
    private readonly dir: string,
    /** Folder holding <locale>/practice-test-N.json translations. */
    private readonly translationsDir = join(dir, "translations"),
    /** First capture group is the exam number. */
    private readonly filePattern = SAA_PRACTICE_TEST_FILE,
  ) {
    super();
  }

  /** Practice-test files keyed by exam number. Two files with one number fail the build. */
  private files(): Map<number, string> {
    const files = new Map<number, string>();
    for (const file of readdirSync(this.dir).sort()) {
      const m = this.filePattern.exec(file);
      if (!m) continue;
      const number = Number(m[1]);
      const other = files.get(number);
      if (other) throw new Error(`${this.dir}: "${other}" and "${file}" are both Practice Test #${number}; delete the duplicate`);
      files.set(number, file);
    }
    return files;
  }

  readExams(certId: CertificationId, locale: ContentLocale): Exam[] {
    return [...this.files()]
      .map(([number, file]) => this.readExam(certId, number, file, locale))
      .sort((a, b) => a.number - b.number);
  }

  private translations(locale: ContentLocale, number: number): { path: string; entries: Record<string, unknown> } {
    const path = join(this.translationsDir, locale, `practice-test-${number}.json`);
    if (locale === "en" || !existsSync(path)) return { path, entries: {} };
    return { path, entries: JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown> };
  }

  private readExam(certId: CertificationId, number: number, file: string, locale: ContentLocale): Exam {
    const tr = this.translations(locale, number);
    const html = readFileSync(join(this.dir, file), "utf8");
    const match = html.match(/const quizData = (\{[\s\S]*?\});\s*\n/);
    if (!match) throw new Error(`${file}: không tìm thấy quizData`);
    const raw = JSON.parse(match[1]) as { questions: RawQuestion[] };
    const questions = raw.questions.map((q, i) => {
      const t = tr.entries[String(q.id)];
      if (t === undefined) return this.toQuestion(q, i, file, locale);
      this.checkTranslation(t, q, tr.path);
      return this.toQuestion(q, i, file, locale, t);
    });
    return {
      id: String(number),
      certId,
      locale,
      translatedCount: questions.filter((q) => q.translated).length,
      number,
      title: `Practice Test #${number}`,
      questionCount: questions.length,
      multiSelectCount: questions.filter((q) => q.selectCount > 1).length,
      questions,
    };
  }

  /**
   * A translation must have every field and exactly the original's answers, in order, or option keys and
   * the correct answers would point at the wrong text. Fails the build instead of quietly showing English.
   */
  private checkTranslation(t: unknown, raw: RawQuestion, path: string): asserts t is Translations[string] {
    const where = `${path}: question id ${raw.id}`;
    const e = (t ?? {}) as Partial<Record<keyof Translations[string], unknown>>;
    for (const field of ["prompt", "explanation"] as const) {
      const v = e[field];
      if (typeof v !== "string" || !v.trim()) throw new Error(`${where} has no "${field}"`);
    }
    if (!Array.isArray(e.answers) || e.answers.some((a) => typeof a !== "string")) throw new Error(`${where} has no "answers" list`);
    if (e.answers.length !== raw.prompt.answers.length) {
      throw new Error(`${where} has ${e.answers.length} answers, the original has ${raw.prompt.answers.length}`);
    }
  }

  private toQuestion(raw: RawQuestion, i: number, file: string, locale: ContentLocale, t?: Translations[string]): Question {
    const text = t ?? { prompt: raw.prompt.question, answers: raw.prompt.answers, explanation: raw.prompt.explanation };
    const options = text.answers.map((html, k) => ({ key: String.fromCharCode(97 + k), html: this.sanitizer.sanitize(html) }));
    const correct = [...raw.correct_response].sort();
    if (!correct.length || correct.some((k) => !options.some((o) => o.key === k))) {
      throw new Error(`${file} câu ${i + 1}: đáp án ${correct.join(",")} không khớp các lựa chọn`);
    }
    return {
      id: String(raw.id),
      translated: locale === "en" || Boolean(t),
      number: i + 1,
      domain: raw.section ?? "",
      selectCount: correct.length,
      promptHtml: this.sanitizer.sanitize(text.prompt),
      options,
      correct,
      explanationHtml: this.sanitizer.sanitize(text.explanation),
    };
  }
}
