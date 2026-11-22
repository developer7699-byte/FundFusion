import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ok } from './common/http';
import { platformConfig } from './config/platform.config';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('health')
  health() {
    return ok({
      service: `${platformConfig().platformName} API`,
      status: 'ok',
    });
  }
}
