export type PasswordRule = { id: string; label: string; test: (pw: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { id: "upper", label: "At least one uppercase letter (A-Z)", test: (pw) => /[A-Z]/.test(pw) },
  { id: "lower", label: "At least one lowercase letter (a-z)", test: (pw) => /[a-z]/.test(pw) },
  { id: "number", label: "At least one digit (0-9)", test: (pw) => /[0-9]/.test(pw) },
];

export function validatePassword(password: string): string[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label);
}

export function isPasswordValid(password: string): boolean {
  return validatePassword(password).length === 0;
}
