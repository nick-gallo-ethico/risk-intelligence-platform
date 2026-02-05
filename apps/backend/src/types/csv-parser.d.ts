declare module "csv-parser" {
  import { Transform } from "stream";

  interface CsvParserOptions {
    separator?: string;
    newline?: string;
    quote?: string;
    escape?: string;
    headers?: string[] | boolean | ((headers: string[]) => string[]);
    mapHeaders?: (args: { header: string; index: number }) => string | null;
    mapValues?: (args: {
      header: string;
      index: number;
      value: string;
    }) => unknown;
    strict?: boolean;
    skipLines?: number;
    maxRowBytes?: number;
    skipComments?: boolean | string;
  }

  function csvParser(options?: CsvParserOptions): Transform;

  export = csvParser;
}
