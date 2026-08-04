import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type TaskProgressDocument = HydratedDocument<TaskProgress>;

@Schema({ timestamps: true, versionKey: false })
export class TaskProgress {
  @Prop({ required: true, unique: true, index: true })
  taskId!: string;

  @Prop({ required: true, default: false })
  completed!: boolean;

  @Prop({ required: true, default: "" })
  note!: string;
}

export const TaskProgressSchema = SchemaFactory.createForClass(TaskProgress);
