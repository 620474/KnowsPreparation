export class OpenAiSseParser {
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

  private parseFrame(frame: string): unknown[] {
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return [];
    try {
      return [JSON.parse(data)];
    } catch {
      return [];
    }
  }
}
