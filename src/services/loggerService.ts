import axios from "axios";

enum Operations {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  GET_BY_ID = "GET_BY_ID",
}

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const LOGS_ENDPOINT = "/api/logs"; 
const API_KEY = process.env.API_KEY;

export class LoggerService {
  private apiEndpoint: string;
  private apiService: typeof axios;
  public logs: any;
  public user_id: string;
  public bot_id?: string;

  constructor(
    endpoint: string,
    method: string,
    query: any,
    params: any,
    body: any,
    bot_id?: string,
    user_id?: string,
    request_id?: string
  ) {
    this.apiEndpoint = `${API_BASE_URL}${LOGS_ENDPOINT}`;
    this.apiService = axios;
    this.bot_id = bot_id;
    this.user_id = user_id || this.generateUserId(bot_id);
    this.logs = {
      apiEndpoint: endpoint,
      method,
      queryParameters: { ...query },
      params: { ...params },
      body: { ...body },
      bot_id: this.bot_id,
      user_id: this.user_id,
      start_time: Date.now(),
      steps: [],
    };

    if (request_id) {
      this.logs.request_id = request_id;
      this.callApi(Operations.GET_BY_ID);
    } else {
      this.callApi(Operations.CREATE);
    }
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (API_KEY) {
      headers["x-api-key"] = API_KEY;
    }
    return headers;
  }

  private generateUserId(bot_id?: string) {
    const randomChars = Math.random().toString(36).substring(2, 8);
    return `${bot_id || "bot"}-${randomChars}`;
  }

  private async callApi(operation: Operations = Operations.CREATE) {
    try {
      if (operation === Operations.CREATE && this.logs.request_id) return;
      if (operation === Operations.CREATE) await this.createLogApi();
      else if (operation === Operations.UPDATE && this.logs.request_id) await this.updateLogApi();
      else if (operation === Operations.DELETE && !this.logs.completed) await this.deleteLogApi();
      else if (operation === Operations.GET_BY_ID && this.logs.request_id) await this.getLogApi();
    } catch (e) {
      console.error("LoggerService callApi error:", e);
    }
  }

  private async createLogApi() {
    try {
      const res = await this.apiService.post(this.apiEndpoint, this.logs, {
        headers: this.getHeaders(),
      });
      if (res.data && res.data.log) {
        this.logs.request_id = res.data.log._id;
      }
    } catch (e) {
      console.error("LoggerService createLogApi error:", e);
    }
  }

  private async updateLogApi() {
    try {
      const updatedLogs = { ...this.logs };
      delete updatedLogs.request_id;
      await this.apiService.put(
        `${this.apiEndpoint}/${this.logs.request_id}`,
        updatedLogs,
        { headers: this.getHeaders() }
      );
    } catch (e) {
      console.error("LoggerService updateLogApi error:", e);
    }
  }

  private async deleteLogApi() {
    try {
      await this.apiService.delete(
        `${this.apiEndpoint}/${this.logs.request_id}`,
        { headers: this.getHeaders() }
      );
      this.logs = {};
    } catch (e) {
      console.error("LoggerService deleteLogApi error:", e);
    }
  }

  private async getLogApi() {
    try {
      const res = await this.apiService.get(
        `${this.apiEndpoint}/${this.logs.request_id}`,
        { headers: this.getHeaders() }
      );
      if (res.data && res.data.log) {
        this.logs.steps = res.data.log.steps || [];
      }
    } catch (e) {
      console.error("LoggerService getLogApi error:", e);
    }
  }

  public add_step(message: string, metadata?: any, log?: boolean, log_type?: string) {
    const step_number = this.logs.steps.length + 1;
    const step = {
      step_number,
      message,
      metadata: metadata || {},
    };
    this.logs.steps.push(step);
    if (log && log_type) this.print(message, log_type);
    this.callApi(Operations.UPDATE);
  }

  public print(log: string, log_type: string) {
    if (log_type === "info") console.info(log);
    else if (log_type === "error") console.error(log);
    else if (log_type === "warning") console.warn(log);
    else console.log(log);
  }

  public end_log(
    status_code: number,
    response: any,
    msg?: string,
    log_type?: string,
    completed: boolean = true
  ) {
    if (msg && log_type) this.print(msg, log_type);
    this.add_step(msg || "", {
      responseStatusCode: status_code,
      completionTime: Date.now() - this.logs.start_time,
      start_time: null,
      completed,
    });
    return this.logs.request_id;
  }
}