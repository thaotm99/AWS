// Build-time only (uses fs). Never import from a client component.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CertificationId, Exam, Question } from "../domain/types";
import { ExamSource } from "./ExamSource";
import { HtmlSanitizer } from "./HtmlSanitizer";

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
    /** First capture group is the exam number. */
    private readonly filePattern = /Practice Test #(\d+)/,
  ) {
    super();
  }

  readExams(certId: CertificationId): Exam[] {
    return readdirSync(this.dir)
      .filter((f) => f.endsWith(".html") && this.filePattern.test(f))
      .map((file) => this.readExam(certId, file))
      .sort((a, b) => a.number - b.number);
  }

  private readExam(certId: CertificationId, file: string): Exam {
    const number = Number(this.filePattern.exec(file)![1]);
    const html = readFileSync(join(this.dir, file), "utf8");
    const match = html.match(/const quizData = (\{[\s\S]*?\});\s*\n/);
    if (!match) throw new Error(`${file}: không tìm thấy quizData`);
    const raw = JSON.parse(match[1]) as { questions: RawQuestion[] };
    const questions = raw.questions.map((q, i) => this.toQuestion(q, i, file));
    return {
      id: String(number),
      certId,
      number,
      title: `Practice Test #${number}`,
      questionCount: questions.length,
      multiSelectCount: questions.filter((q) => q.selectCount > 1).length,
      questions,
    };
  }

  private toQuestion(raw: RawQuestion, i: number, file: string): Question {
    const options = raw.prompt.answers.map((html, k) => ({ key: String.fromCharCode(97 + k), html: this.sanitizer.sanitize(html) }));
    const correct = [...raw.correct_response].sort();
    if (!correct.length || correct.some((k) => !options.some((o) => o.key === k))) {
      throw new Error(`${file} câu ${i + 1}: đáp án ${correct.join(",")} không khớp các lựa chọn`);
    }
    return {
      id: String(raw.id),
      number: i + 1,
      domain: raw.section ?? "",
      selectCount: correct.length,
      promptHtml: this.sanitizer.sanitize(raw.prompt.question),
      options,
      correct,
      explanationHtml: this.sanitizer.sanitize(raw.prompt.explanation),
    };
  }
}
