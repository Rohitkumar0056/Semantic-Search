import { generateQueryVariations } from "../generateQueryVariation";
import { executeQueryVariations } from "../executeQueryVariations";
import { textSearchFromText } from "./textSearchService";
import { LoggerService } from "../loggerService";

export async function queryQuestionsByText(
  query_text: string,
  bot_id: string,
  limit: number,
  number_of_queries?: number,
  filter: Record<string, any> = {},
  logger?: LoggerService
): Promise<any> {
  try {
    const query_variations = await generateQueryVariations(
      query_text,
      number_of_queries,
      logger
    );

    const merged_results = await executeQueryVariations(
      query_variations,
      textSearchFromText,
      bot_id,
      limit,
      filter,
      undefined,
      logger
    );

    // Remove timestamps for logging
    const logging_results = merged_results.map((result: any) => {
      const { timestamp, created_at, updated_at, ...rest } = result;
      return rest;
    });

    logger?.add_step(
      "queryQuestionsByText: Merged query results",
      { merged_results: logging_results },
      true,
      "info"
    );

    const response = {
      success: true,
      message: "Query by text successful",
      data: merged_results,
      query_variations,
      generated_user_id: logger?.user_id,
    };
    const request_id = logger?.end_log(
      200,
      response,
      "Query by text successful",
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
      "Error querying questions by text",
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
