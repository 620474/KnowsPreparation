import "reflect-metadata";

import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.set("trust proxy", 1);
  app.useBodyParser("json", { limit: "10mb" });
  const config = app.get(ConfigService);
  const configuredOrigins = (config.get<string>("CLIENT_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://localhost",
    "https://localhost",
    "capacitor://localhost",
    ...configuredOrigins,
  ]);

  app.use(helmet());
  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed"), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.setGlobalPrefix("api");
  // Домен живёт под /api/v1, health-чеки остаются на /api/health,
  // потому что на них настроены пробы контейнера.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  const port = config.get<number>("PORT") ?? 3001;
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
