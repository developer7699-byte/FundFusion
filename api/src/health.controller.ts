import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ok } from './common/http';
import { PrototypeStore } from './prototype/prototype.store';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly store: PrototypeStore) {}

  @Get('health')
  health() {
    return ok({
      service: 'nexora-pay-api',
      status: this.store.ready ? 'ok' : 'starting',
      mode: 'mock-prototype',
      persistence: 'in-memory',
      liveRails: false,
    });
  }
}
