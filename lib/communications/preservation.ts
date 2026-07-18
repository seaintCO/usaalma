const PROTECTED_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /https?:\/\/[^\s)]+/gi,
  /\b(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g,
  /\b(?:INV|EST|PROJ|JOB|PO|REF)-?[A-Z0-9-]+\b/gi,
  /\$\s?\d+(?:,\d{3})*(?:\.\d{2})?/g,
  /\b\d+(?:\.\d+)?\s?(?:ft|feet|in|inch|inches|yd|yard|yards|sq ft|sf|m|cm|mm|lb|lbs|kg|gal|gallons)\b/gi,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /"[^"]*"/g,
  /'[^']*'/g,
];

export type ProtectedToken = {
  placeholder: string;
  value: string;
};

export function protectBusinessTokens(text: string) {
  const tokens: ProtectedToken[] = [];
  let protectedText = text;
  for (const pattern of PROTECTED_PATTERNS) {
    protectedText = protectedText.replace(pattern, (match) => {
      const existing = tokens.find((token) => token.value === match);
      if (existing) return existing.placeholder;
      const placeholder = `__ALMA_TOKEN_${tokens.length}__`;
      tokens.push({ placeholder, value: match });
      return placeholder;
    });
  }
  return { protectedText, tokens };
}

export function restoreBusinessTokens(text: string, tokens: ProtectedToken[]) {
  return tokens.reduce(
    (result, token) => result.split(token.placeholder).join(token.value),
    text,
  );
}
