import axios from "axios";
import { LoggerService } from "./loggerService";

const KRUTRIM_API_URL =process.env.CHAT_AI_URL || "";
const KRUTRIM_API_KEY = process.env.AI_KEY || "";

export async function generateQueryVariations(
  query_text: string,
  number_of_queries: number = 3,
  logger?: LoggerService
): Promise<string[]> {
  if (!number_of_queries || number_of_queries <= 0 || number_of_queries > 8) {
    number_of_queries = 3;
  }

  const prompt = `Can you generate this query in ${number_of_queries} ways as a comma-separated list only? Your response must not contain anything else other than the comma separated queries. Query:${query_text}`;

  try {
    const response = await axios.post(
      KRUTRIM_API_URL,
      {
        model: "Llama-3.3-70B-Instruct",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${KRUTRIM_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      logger?.add_step(
        "generateQueryVariations: Krutrim API did not return data. Proceeding with the original query.",
        {},
        true,
        "warning"
      );
      return [query_text];
    }
    let variations = [query_text];
    if (content) {
      const generated = content
        .split(",")
        .map((q: string) => q.trim())
        .filter(Boolean);
      if (number_of_queries === 1) {
        // Only take the first variation
        if (generated.length > 0) {
          variations.push(generated[0]);
        }
      } else {
        variations = [query_text, ...generated];
      }
      logger?.add_step(
        "generateQueryVariations: Generated query variations",
        { query_variations: variations },
        true,
        "info"
      );
    }
    return variations;
  } catch (err: any) {
    logger?.add_step(
      "generateQueryVariations: Krutrim API error, using original query.",
      { error: err?.message || err },
      true,
      "error"
    );
    return [query_text];
  }
}
