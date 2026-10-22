// Build-time only (uses fs). Never import from a client component.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CertificationId, ContentLocale, Exam, Question } from "../domain/types";
import { ExamSource } from "./ExamSource";
import { HtmlSanitizer } from "./HtmlSanitizer";

/** solution-architect-aws/translations/<locale>/practice-test-N.json, keyed by question id. */
type Translations = Record<string, { prompt: string; answers: string[]; explanation: string }>;

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
    private readonly filePattern = /Practice Test #(\d+)/,
  ) {
    super();
  }

  readExams(certId: CertificationId, locale: ContentLocale): Exam[] {
    return readdirSync(this.dir)
      .filter((f) => f.endsWith(".html") && this.filePattern.test(f))
      .map((file) => this.readExam(certId, file, locale))
      .sort((a, b) => a.number - b.number);
  }

  private translations(locale: ContentLocale, number: number): Translations {
    if (locale === "en") return {};
    const path = join(this.translationsDir, locale, `practice-test-${number}.json`);
    return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Translations) : {};
  }

  private readExam(certId: CertificationId, file: string, locale: ContentLocale): Exam {
    const number = Number(this.filePattern.exec(file)![1]);
    const tr = this.translations(locale, number);
    const html = readFileSync(join(this.dir, file), "utf8");
    const match = html.match(/const quizData = (\{[\s\S]*?\});\s*\n/);
    if (!match) throw new Error(`${file}: không tìm thấy quizData`);
    const raw = JSON.parse(match[1]) as { questions: RawQuestion[] };
    const questions = raw.questions.map((q, i) => this.toQuestion(q, i, file, locale, tr[String(q.id)]));
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

  private toQuestion(raw: RawQuestion, i: number, file: string, locale: ContentLocale, translation?: Translations[string]): Question {
    // A translation is used only when it has every answer, so option keys and the correct answers stay valid.
    const t = translation && translation.answers.length === raw.prompt.answers.length ? translation : undefined;
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
