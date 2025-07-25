import express, { Request, Response } from "express";
import { LoggerService } from "../services/loggerService";
import { queryQuestionsByVector } from "../services/vector-search/queryQuestionsByVector";
import { queryQuestionsByText } from "../services/text-search/queryQuestionsByText";
import { queryQuestionsByHybrid } from "../services/hybrid-search/queryQuestionsByHybrid";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

export async function getBotDefinition(botId: string) {
  const client = new MongoClient(process.env.MONGODB_URI!);
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || "");
    const collection = db.collection("botdefinitions");
    return await collection.findOne({ botId });
  } finally {
    await client.close();
  }
}

function convertOperators(obj: any): any {
  if (typeof obj !== "object" || obj === null) return obj;
  const operatorMap: Record<string, string> = {
    gt: "$gt",
    gte: "$gte",
    lt: "$lt",
    lte: "$lte",
    ne: "$ne",
    eq: "$eq",
    in: "$in",
    nin: "$nin",
  };
  if (
    typeof obj === "object" &&
    obj !== null &&
    Object.keys(obj).length === 1 &&
    Object.keys(obj)[0] === "eq"
  ) {
    return obj["eq"];
  }

  const result: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (operatorMap[key]) {
      result[operatorMap[key]] = convertOperators(obj[key]);
    } else if (typeof obj[key] === "object") {
      result[key] = convertOperators(obj[key]);
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

function parseFilters(query: any): Record<string, any> {
  let filter: Record<string, any> = {};
  if (query.filters) {
    try {
      const raw =
        typeof query.filters === "string"
          ? JSON.parse(query.filters)
          : query.filters;
          console.log("Raw filters:", raw);
      filter = convertOperators(raw);
      console.log("Mongo filters:", filter);
    } catch (e) {
      console.warn("Invalid filters JSON:", query.filters);
    }
  }
  return filter;
}

router.get("/vector-search", async (req: Request, res: Response) => {
  const { query_text, bot_id, limit, number_of_queries } = req.query;
  if (!query_text || !bot_id || !limit) {
    res.status(400).json({ error: "Missing required parameters" });
    return;
  }

  // Fetch bot definition
  const botDef = await getBotDefinition(bot_id as string);
  if (!botDef) {
    res.status(404).json({ error: "Bot definition not found" });
    return;
  }
  if ((botDef.Algorithm || "").toLowerCase() !== "vector") {
    res
      .status(403)
      .json({
        error: `This bot is configured for '${botDef.Algorithm}' search only.`,
      });
    return;
  }

  const embeddingModel = botDef.embeddingModel || "Bhasantarit";
  const filter = parseFilters(req.query);

  const result = await queryQuestionsByVector(
    query_text as string,
    bot_id as string,
    parseInt(limit as string, 10),
    embeddingModel,
    number_of_queries ? parseInt(number_of_queries as string, 10) : undefined,
    filter
  );
  res.json(result);
});

router.get("/text-search", async (req: Request, res: Response) => {
  const { query_text, bot_id, limit, number_of_queries } = req.query;
  if (!query_text || !bot_id || !limit) {
    res.status(400).json({ error: "Missing required parameters" });
    return;
  }

  // Fetch bot definition
  const botDef = await getBotDefinition(bot_id as string);
  if (!botDef) {
    res.status(404).json({ error: "Bot definition not found" });
    return;
  }
  if ((botDef.Algorithm || "").toLowerCase() !== "text") {
    res
      .status(403)
      .json({
        error: `This bot is configured for '${botDef.Algorithm}' search only.`,
      });
    return;
  }

  const filter = parseFilters(req.query);

  const result = await queryQuestionsByText(
    query_text as string,
    bot_id as string,
    parseInt(limit as string, 10),
    number_of_queries ? parseInt(number_of_queries as string, 10) : undefined,
    filter
  );
  res.json(result);
});

router.get("/hybrid-search", async (req: Request, res: Response): Promise<void> => {
    const { query_text, bot_id, limit, number_of_queries } = req.query;

    if (!query_text || !bot_id || !limit) {
      res.status(400).json({ error: "Missing required parameters" });
      return;
    }

    // Fetch bot definition
    const botDef = await getBotDefinition(bot_id as string);
    if (!botDef) {
      res.status(404).json({ error: "Bot definition not found" });
      return;
    }
    if ((botDef.Algorithm || "").toLowerCase() !== "hybrid") {
      res
        .status(403)
        .json({
          error: `This bot is configured for '${botDef.Algorithm}' search only.`,
        });
      return;
    }

    const embeddingModel = botDef.embeddingModel || "Bhasantarit";
    const filter = parseFilters(req.query);

    const result = await queryQuestionsByHybrid(
      query_text as string,
      bot_id as string,
      parseInt(limit as string, 10),
      embeddingModel,
      number_of_queries ? parseInt(number_of_queries as string, 10) : undefined,
      filter
    );
    res.json(result);
  }
);

router.get("/search/:type", async (req: Request, res: Response) => {
  const { type } = req.params;
  const { query_text, bot_id, limit, number_of_queries, user_id } = req.query;

  // Create logger instance
  const logger = new LoggerService(
    req.path,
    req.method,
    req.query,
    {},
    {},
    bot_id as string,
    user_id as string
  );
  logger.add_step(
    `search.ts : search : ${type} query request received`,
    {},
    true,
    "info"
  );

  if (!type || !query_text || !bot_id || !limit) {
    const response = {
      success: false,
      message: "Missing required parameters",
      data: {},
      generated_user_id: logger.user_id,
    };
    logger.end_log(400, response, "Invalid request parameters", "error");
    res.status(400).json(response);
    return;
  }

  // Fetch bot definition
  const botDef = await getBotDefinition(bot_id as string);
  if (!botDef) {
    const response = {
      success: false,
      message: "Bot definition not found",
      data: {},
      generated_user_id: logger.user_id,
    };
    logger.end_log(404, response, "Bot definition not found", "error");
    res.status(404).json(response);
    return;
  }

  const filter = parseFilters(req.query);
  const nQueries = number_of_queries
    ? parseInt(number_of_queries as string, 10)
    : undefined;
  const lim = parseInt(limit as string, 10);

  if (type === "vector") {
    if ((botDef.Algorithm || "").toLowerCase() !== "vector") {
      const response = {
        success: false,
        message: `This bot is configured for '${botDef.Algorithm}' search only.`,
        data: {},
        generated_user_id: logger.user_id,
      };
      logger.end_log(403, response, "Invalid algorithm", "error");
      res.status(403).json(response);
      return;
    }
    const embeddingModel = botDef.embeddingModel || "Bhasantarit";
    const result = await queryQuestionsByVector(
      query_text as string,
      bot_id as string,
      lim,
      embeddingModel,
      nQueries,
      filter,
      logger
    );
    res.json(result);
  } else if (type === "text") {
    if ((botDef.Algorithm || "").toLowerCase() !== "text") {
      const response = {
        success: false,
        message: `This bot is configured for '${botDef.Algorithm}' search only.`,
        data: {},
        generated_user_id: logger.user_id,
      };
      logger.end_log(403, response, "Invalid algorithm", "error");
      res.status(403).json(response);
      return;
    }
    const result = await queryQuestionsByText(
      query_text as string,
      bot_id as string,
      lim,
      nQueries,
      filter,
      logger
    );
    res.json(result);
  } else if (type === "hybrid") {
    if ((botDef.Algorithm || "").toLowerCase() !== "hybrid") {
      const response = {
        success: false,
        message: `This bot is configured for '${botDef.Algorithm}' search only.`,
        data: {},
        generated_user_id: logger.user_id,
      };
      logger.end_log(403, response, "Invalid algorithm", "error");
      res.status(403).json(response);
      return;
    }
    const embeddingModel = botDef.embeddingModel || "Bhasantarit";
    const result = await queryQuestionsByHybrid(
      query_text as string,
      bot_id as string,
      lim,
      embeddingModel,
      nQueries,
      filter,
      logger
    );
    res.json(result);
  } else {
    const response = {
      success: false,
      message: "Invalid query type",
      data: {},
      generated_user_id: logger.user_id,
      type,
    };
    logger.end_log(400, response, "Invalid query type", "error");
    res.status(400).json(response);
  }
});

export default router;
