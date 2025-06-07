// BSD: Provides data sanitization services to redact or mask sensitive information from logs.

export interface SanitizationRule {
  pattern: RegExp;
  replacement: string;
}

export class DataSanitizer {
  private rules: SanitizationRule[];

  constructor(rules: SanitizationRule[] = []) {
    this.rules = rules;
    // Add default rules for common sensitive data
    this.addDefaultRules();
  }

  private addDefaultRules(): void {
    // Rule for passwords (in JSON-like strings)
    this.rules.push({
      pattern: /("password"\s*:\s*)"[^"]*"/gi,
      replacement: '$1"***REDACTED***"'
    });
    // Rule for email addresses
    this.rules.push({
      pattern: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
      replacement: '***REDACTED_EMAIL***'
    });
    // Rule for common API keys/tokens
    this.rules.push({
        pattern: /(["']?(?:api_key|token|client_secret)["']?\s*:\s*["'])([^"'\s]+)(["']?)/gi,
        replacement: '$1***REDACTED***$3'
    });
  }

  public sanitize(data: string): string {
    let sanitizedData = data;
    for (const rule of this.rules) {
      sanitizedData = sanitizedData.replace(rule.pattern, rule.replacement);
    }
    return sanitizedData;
  }

  public addRule(rule: SanitizationRule): void {
    this.rules.push(rule);
  }
} 