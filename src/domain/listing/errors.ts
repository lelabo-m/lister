import { Data } from "effect";

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  id: string;
}> {}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  reason: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string;
  message: string;
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  cause: unknown;
}> {}
