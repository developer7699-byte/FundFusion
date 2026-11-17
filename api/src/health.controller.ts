import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ok } from './common/http';
import { PrototypeStore } from './prototype/prototype.store';
import { platformConfig } from './config/platform.config';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly store: PrototypeStore) {}

  @Get('health')
  health() {
    return ok({
      service: `${platformConfig().platformName} API`,
      status: this.store.ready ? 'ok' : 'starting',
      mode: 'mock-prototype',
      persistence: 'in-memory',
      liveRails: false,
    });
  }
}
