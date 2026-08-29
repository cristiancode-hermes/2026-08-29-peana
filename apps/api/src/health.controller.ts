import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  ping() {
    return { ok: true, port: Number(process.env.PORT || 3078) };
  }
}
