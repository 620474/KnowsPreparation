import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ItemExposureDocument = HydratedDocument<ItemExposureEntry>;

@Schema({ timestamps: true, versionKey: false, collection: "item_exposures_v1" })
export class ItemExposureEntry {
  @Prop({ required: true, index: true }) itemId!: string;
  @Prop({ required: true, index: true }) familyId!: string;
  @Prop({ required: true, index: true }) formId!: string;
  @Prop({ required: true, default: "legacy" }) conceptFamilyId!: string;
  @Prop({ required: true, default: "legacy" }) formFamilyId!: string;
  @Prop({ required: true, default: "legacy" }) contextFamilyId!: string;
  @Prop({ required: true, default: "legacy" }) contentHash!: string;
  @Prop({ required: true, default: "general", index: true }) targetId!: string;
  @Prop({ required: true }) viewCount!: number;
  @Prop({ required: true }) attemptCount!: number;
  @Prop({ required: true, default: false }) answerRevealed!: boolean;
  @Prop({ type: [String], default: [] }) viewedLeaseIds!: string[];
  @Prop({ type: [String], default: [] }) attemptedOperationIds!: string[];
  @Prop({ type: Date, required: true }) firstSeenAt!: Date;
  @Prop({ type: Date, required: true }) lastSeenAt!: Date;
}

export const ItemExposureEntrySchema = SchemaFactory.createForClass(ItemExposureEntry);
ItemExposureEntrySchema.index({ targetId: 1, itemId: 1 }, { unique: true });
