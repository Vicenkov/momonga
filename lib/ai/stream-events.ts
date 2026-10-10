export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "error"; code: string; message: string };