import { generateQueryVariations } from "../generateQueryVariation";
import { executeQueryVariations } from "../executeQueryVariations";
import { vectorSearchFromText } from "./vectorSearchService";
import { LoggerService } from "../loggerService";
import { request } from "http";

export async function queryQuestionsByVector(
  query_text: string,
  bot_id: string,
  limit: number,
  embeddingModel: string = "Bhasantarit",
  number_of_queries?: number,
  filter: Record<string, any> = {},
  logger?: LoggerService
): Promise<any> {
  try {
    // Generate query variations
    const query_variations = await generateQueryVariations(
      query_text,
      number_of_queries,
      logger
    );

    // Execute queries for each variation and merge the results
    const merged_results = await executeQueryVariations(
      query_variations,
      vectorSearchFromText,
      bot_id,
      limit,
      filter,
      embeddingModel,
      logger
    );

    // Remove timestamps for logging
    const logging_results = merged_results.map((result: any) => {
      const { timestamp, created_at, updated_at, ...rest } = result;
      return rest;
    });

    logger?.add_step(
      "queryQuestionsByVector: Merged query results",
      { merged_results: logging_results },
      true,
      "info"
    );

    const response = {
      success: true,
      message: "Query by vector successful",
      data: merged_results,
      query_variations,
      generated_user_id: logger?.user_id,
    };
    const request_id = logger?.end_log(
      200,
      response,
      "Query by vector successful",
      "info",
      false
    );
    return { ...response, request_id };
  } catch (e: any) {
    logger?.end_log(
      500,
      {
        success: false,
        message: String(e),
        generated_user_id: logger?.user_id,
      },
      "Error querying questions by vector",
      "error"
    );
    return {
      success: false,
      message: "Internal Server Error, check logs",
      data: [],
      generated_user_id: logger?.user_id,
    };
  }
}
