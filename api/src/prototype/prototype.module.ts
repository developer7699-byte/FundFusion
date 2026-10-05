import { Global, Module } from '@nestjs/common';
import { PrototypeStore } from './prototype.store';

@Global()
@Module({
  providers: [PrototypeStore],
  exports: [PrototypeStore],
})
export class PrototypeModule {}
