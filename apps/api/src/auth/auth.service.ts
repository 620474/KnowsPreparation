import { createHash, timingSafeEqual } from "node:crypto";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async login(password: string) {
    const expectedPassword = this.config.get<string>("APP_PASSWORD") ?? "change-me-local";
    const actualHash = createHash("sha256").update(password).digest();
    const expectedHash = createHash("sha256").update(expectedPassword).digest();

    if (!timingSafeEqual(actualHash, expectedHash)) {
      throw new UnauthorizedException("Неверный пароль");
    }

    return {
      token: await this.jwt.signAsync({ sub: "owner", scope: "learning:write" }),
    };
  }
}
