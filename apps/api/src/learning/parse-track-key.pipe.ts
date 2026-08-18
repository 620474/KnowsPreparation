import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";

import { isTrackKey, TRACK_KEYS, type TrackKey } from "./track-registry";

/**
 * Превращает параметр пути в ключ трека и отклоняет неизвестные значения,
 * чтобы дальше в сервис попадал только валидный TrackKey.
 */
@Injectable()
export class ParseTrackKeyPipe implements PipeTransform<string, TrackKey> {
  transform(value: string): TrackKey {
    if (!isTrackKey(value)) {
      throw new BadRequestException(
        `Неизвестный трек. Доступные значения: ${TRACK_KEYS.join(", ")}`,
      );
    }
    return value;
  }
}
