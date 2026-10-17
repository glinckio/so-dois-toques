import { Global, Module } from "@nestjs/common";
import { EvolutionClientService } from "./evolution-client.service";

@Global()
@Module({
  providers: [EvolutionClientService],
  exports: [EvolutionClientService],
})
export class EvolutionClientModule {}
