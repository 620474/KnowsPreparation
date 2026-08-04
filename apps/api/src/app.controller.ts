import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";

@Controller()
export class AppController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get("health")
  readiness() {
    const timestamp = new Date().toISOString();

    if (this.connection.readyState !== 1) {
      throw new ServiceUnavailableException({
        status: "unavailable",
        database: "disconnected",
        timestamp,
      });
    }

    return { status: "ok", database: "connected", timestamp };
  }

  @Get("health/live")
  liveness() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
