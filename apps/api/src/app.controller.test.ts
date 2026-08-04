import { ServiceUnavailableException } from "@nestjs/common";
import type { Connection } from "mongoose";
import { describe, expect, it } from "vitest";

import { AppController } from "./app.controller";

describe("AppController health checks", () => {
  it("reports readiness when MongoDB is connected", () => {
    const controller = new AppController({ readyState: 1 } as Connection);

    expect(controller.readiness()).toMatchObject({
      status: "ok",
      database: "connected",
    });
  });

  it("rejects readiness when MongoDB is disconnected", () => {
    const controller = new AppController({ readyState: 0 } as Connection);

    expect(() => controller.readiness()).toThrow(ServiceUnavailableException);
  });

  it("reports liveness independently of MongoDB", () => {
    const controller = new AppController({ readyState: 0 } as Connection);

    expect(controller.liveness()).toMatchObject({ status: "ok" });
  });
});
