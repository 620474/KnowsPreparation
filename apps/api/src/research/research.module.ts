import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { ResearchService } from "../learning/research.service";
import {
  ResearchClaimEntry,
  ResearchClaimEntrySchema,
} from "../learning/schemas/research-claim.schema";
import {
  ResearchEvidenceEntry,
  ResearchEvidenceEntrySchema,
} from "../learning/schemas/research-evidence.schema";
import {
  ResearchProject,
  ResearchProjectSchema,
} from "../learning/schemas/research-project.schema";
import { ResearchController } from "./research.controller";
import { ResearchAgentService } from "./research-agent.service";
import {
  ResearchAgentRunEntry,
  ResearchAgentRunEntrySchema,
} from "./schemas/research-agent-run.schema";
import {
  ResearchActionEntry,
  ResearchActionEntrySchema,
} from "./schemas/research-action.schema";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: ResearchProject.name, schema: ResearchProjectSchema },
      { name: ResearchEvidenceEntry.name, schema: ResearchEvidenceEntrySchema },
      { name: ResearchClaimEntry.name, schema: ResearchClaimEntrySchema },
      { name: ResearchAgentRunEntry.name, schema: ResearchAgentRunEntrySchema },
      { name: ResearchActionEntry.name, schema: ResearchActionEntrySchema },
    ]),
  ],
  controllers: [ResearchController],
  providers: [ResearchService, ResearchAgentService],
  exports: [MongooseModule],
})
export class ResearchModule {}
