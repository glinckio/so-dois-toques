import { Controller, Get, Header, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service.js";
import { checkHealth, type HealthStatus } from "./health.js";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  async get(@Res({ passthrough: true }) res: Response): Promise<HealthStatus> {
    const health = await checkHealth(this.prisma);
    res.status(health.status === "ok" ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return health;
  }
}
