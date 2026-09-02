import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  InterviewSession,
  InterviewSessionSchema,
} from "../learning/schemas/interview-session.schema";
import { AiInvocationEntry, AiInvocationEntrySchema } from "../learning/schemas/ai-invocation.schema";
import { AiAgentService } from "./ai-agent.service";
import { ExamAiLockService } from "./exam-ai-lock.service";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InterviewSession.name, schema: InterviewSessionSchema },
      { name: AiInvocationEntry.name, schema: AiInvocationEntrySchema },
    ]),
  ],
  providers: [AiAgentService, ExamAiLockService],
  exports: [AiAgentService, ExamAiLockService],
})
export class AgentModule {}
