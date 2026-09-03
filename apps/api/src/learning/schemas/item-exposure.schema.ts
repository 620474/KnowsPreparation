import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ItemExposureDocument = HydratedDocument<ItemExposureEntry>;

@Schema({ timestamps: true, versionKey: false, collection: "item_exposures_v1" })
export class ItemExposureEntry {
  @Prop({ required: true, unique: true, index: true }) itemId!: string;
  @Prop({ required: true, index: true }) familyId!: string;
  @Prop({ required: true, index: true }) formId!: string;
  @Prop({ required: true }) viewCount!: number;
  @Prop({ required: true }) attemptCount!: number;
  @Prop({ required: true, default: false }) answerRevealed!: boolean;
  @Prop({ type: Date, required: true }) firstSeenAt!: Date;
  @Prop({ type: Date, required: true }) lastSeenAt!: Date;
}

export const ItemExposureEntrySchema = SchemaFactory.createForClass(ItemExposureEntry);
