import type { APIRoute } from "astro";
import { getCurriculum } from "../data/exam";
import { GLOSSARY } from "../data/glossary";

// GET /flashcards.json: one card per glossary term, in study-path order, for the flashcards page.
export const GET: APIRoute = () => {
  const layers = getCurriculum();
  const layerOf = new Map(layers.flatMap((l) => l.concepts.map((c) => [c.id, { n: l.n, concept: c }] as const)));
  const cards = GLOSSARY.map((t) => {
    const home = layerOf.get(t.lesson);
    return {
      id: t.id,
      name: t.name,
      layer: home?.n ?? 0,
      lesson: { id: t.lesson, vi: home?.concept.title ?? "", en: home?.concept.titleEn ?? "" },
      def: { vi: t.vi.def, en: t.en.def },
      example: { vi: t.vi.example ?? "", en: t.en.example ?? "" },
    };
  }).sort((a, b) => a.layer - b.layer);
  return Response.json(cards);
};
