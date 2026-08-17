export interface ParsedSseEvent {
  event: string;
  data: string;
}

export class SseParser {
  private buffer = "";

  push(chunk: string) {
    this.buffer += chunk.replaceAll("\r\n", "\n");
    const frames = this.buffer.split("\n\n");
    this.buffer = frames.pop() ?? "";
    return frames.flatMap((frame) => this.parseFrame(frame));
  }

  finish() {
    const frame = this.buffer;
    this.buffer = "";
    return frame ? this.parseFrame(frame) : [];
  }

  private parseFrame(frame: string): ParsedSseEvent[] {
    if (!frame || frame.startsWith(":")) return [];
    let event = "message";
    const data: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    return data.length > 0 ? [{ event, data: data.join("\n") }] : [];
  }
}
