import { randomUUID } from "node:crypto";

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import { AppController } from "./app.controller";
import { AgentModule } from "./agents/agent.module";
import { AuthModule } from "./auth/auth.module";
import { LearningModule } from "./learning/learning.module";

function validateEnvironment(config: Record<string, unknown>) {
  if (config.NODE_ENV !== "production") {
    return config;
  }

  const requiredKeys = ["MONGODB_URI", "APP_PASSWORD", "JWT_SECRET"];
  for (const key of requiredKeys) {
    if (typeof config[key] !== "string" || config[key].length === 0) {
      throw new Error(`${key} is required in production`);
    }
  }

  if ((config.APP_PASSWORD as string).length < 12) {
    throw new Error("APP_PASSWORD must contain at least 12 characters in production");
  }
  if ((config.JWT_SECRET as string).length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
  }

  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId(request, response) {
          const forwardedId = request.headers["x-request-id"];
          const requestId =
            typeof forwardedId === "string" && /^[\w-]{1,128}$/.test(forwardedId)
              ? forwardedId
              : randomUUID();
          response.setHeader("X-Request-Id", requestId);
          return requestId;
        },
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.headers.x-api-key",
            "res.headers.set-cookie",
          ],
          censor: "[REDACTED]",
        },
        customLogLevel(_request, response, error) {
          if (error || response.statusCode >= 500) return "error";
          if (response.statusCode >= 400) return "warn";
          return "info";
        },
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("MONGODB_URI") ?? "mongodb://localhost:27017/frontend_prep",
      }),
    }),
    AuthModule,
    AgentModule,
    LearningModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
