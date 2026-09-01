import { Global, Module } from "@nestjs/common";

import { AiAgentService } from "./ai-agent.service";

@Global()
@Module({
  providers: [AiAgentService],
  exports: [AiAgentService],
})
export class AgentModule {}
