// Which questions have an illustration, keyed by numeric question id. This file is part of the page
// bundle, so it stays tiny: each spec is its own chunk, fetched only after the question is answered.
import type { QuestionId } from "../domain/types";
import type { IllustrationSpec } from "./types";
import { test1 } from "./tests/test1";
import { test2 } from "./tests/test2";
import { test3 } from "./tests/test3";
import { test4 } from "./tests/test4";
import { test5 } from "./tests/test5";
import { test6 } from "./tests/test6";

export type Loader = () => Promise<{ default: IllustrationSpec }>;

export class IllustrationRegistry {
  private readonly cache = new Map<QuestionId, Promise<IllustrationSpec>>();

  constructor(private readonly loaders: Readonly<Record<QuestionId, Loader>>) {}

  has(id: QuestionId): boolean {
    return Object.prototype.hasOwnProperty.call(this.loaders, id);
  }

  load(id: QuestionId): Promise<IllustrationSpec> {
    let spec = this.cache.get(id);
    if (!spec) {
      if (!this.has(id)) return Promise.reject(new Error(`No illustration for question ${id}`));
      spec = this.loaders[id]().then((m) => m.default);
      // A failed download may succeed next time.
      spec.catch(() => this.cache.delete(id));
      this.cache.set(id, spec);
    }
    return spec;
  }
}

// One loader list per practice test of SAA-C03, so each test's illustrations live in their own file.
// Comments in those files name the question number in that test.
export const illustrations = new IllustrationRegistry({ ...test1, ...test2, ...test3, ...test4, ...test5, ...test6 });
