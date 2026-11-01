export const OPERATORS: Record<string, string[]> = {
  string: ["=", "!=", "contains", "exists", "not_exists"],
  number: ["=", "!=", ">", "<", "exists", "not_exists"],
  date: ["=", "!=", ">", "<", "exists", "not_exists"],
  enum: ["=", "!=", "exists", "not_exists"],
  array: ["contains", "length>", "length<", "length=", "exists", "not_exists"]
};
