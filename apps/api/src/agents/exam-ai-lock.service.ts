import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { InterviewSession } from "../learning/schemas/interview-session.schema";

@Injectable()
export class ExamAiLockService {
  constructor(
    @InjectModel(InterviewSession.name)
    private readonly interviewModel: Model<InterviewSession>,
  ) {}

  async assertAvailable() {
    const activeExam = await this.interviewModel.exists({
      kind: "exam",
      status: { $in: ["in_progress", "evaluating"] },
    });
    if (activeExam) {
      throw new BadRequestException("AI недоступен до завершения активного экзамена");
    }
  }
}
