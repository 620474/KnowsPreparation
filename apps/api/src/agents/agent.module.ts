import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  InterviewSession,
  InterviewSessionSchema,
} from "../learning/schemas/interview-session.schema";
import { AiAgentService } from "./ai-agent.service";
import { ExamAiLockService } from "./exam-ai-lock.service";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InterviewSession.name, schema: InterviewSessionSchema },
    ]),
  ],
  providers: [AiAgentService, ExamAiLockService],
  exports: [AiAgentService, ExamAiLockService],
})
export class AgentModule {}
