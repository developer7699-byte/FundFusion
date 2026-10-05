import { Logger, OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly log = new Logger(PrismaService.name);
  available = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.available = true;
    } catch {
      this.available = false;
      this.log.warn('PostgreSQL not connected. Prototype uses the in-memory mock store.');
    }
  }
}
