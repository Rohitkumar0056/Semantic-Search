import { LoggerService } from "./loggerService";

export async function executeQueryVariations(
  query_variations: string[],
  queryFunction: (
    query_text: string,
    bot_id: string,
    limit: number,
    filter: any,
    embeddingModel?: string
  ) => Promise<any[]>,
  bot_id: string,
  limit: number,
  filter: Record<string, any>,
  embeddingModel?: string,
  logger?: LoggerService
): Promise<any[]> {
  const resultsMap = new Map<string, any>();

  for (const variation of query_variations) {
    try {
      logger?.add_step(
        "executeQueryVariations: Querying for variation",
        { variation: variation.trim() },
        true,
        "info"
      );
      const results = await queryFunction(
        variation.trim(),
        bot_id,
        limit,
        filter,
        embeddingModel
      );
      for (const doc of results) {
        const id = doc._id?.toString();
        if (!resultsMap.has(id) || doc.score > resultsMap.get(id).score) {
          resultsMap.set(id, doc); 
        }
      }
    } catch (e: any) {
      logger?.add_step(
        "executeQueryVariations: Error querying variation",
        { variation: variation.trim(), error: e?.message || e },
        true,
        "error"
      );
      continue;
    }
  }

  const originalQuery = query_variations[0];

  // General overlap scorer
  function countQueryOverlap(doc: any, query: string): number {
    const originalWords = new Set(query.toLowerCase().split(/\s+/));
    const combinedText = `${doc.question} ${doc.answer}`.toLowerCase();
    let overlap = 0;
    for (const word of originalWords) {
      if (combinedText.includes(word)) overlap++;
    }
    return overlap;
  }

  const finalResults = [...resultsMap.values()]
    .map((doc) => ({
      ...doc,
      overlap_score: countQueryOverlap(doc, originalQuery),
    }))
    .filter((doc) => doc.overlap_score > 0)
    .sort((a, b) => {
      const aScore = a.score * 0.7 + a.overlap_score * 0.3;
      const bScore = b.score * 0.7 + b.overlap_score * 0.3;
      return bScore - aScore;
    })
    .slice(0, limit); 

  return finalResults;
}
