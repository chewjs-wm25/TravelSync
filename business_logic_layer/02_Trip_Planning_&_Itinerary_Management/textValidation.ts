export function normalizeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function hasMalaysiaBlocklistMatch(value: string): boolean {
  const normalizedValue = value
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedValue) {
    return false;
  }

  const blockedTerms = [
    "singapore",
    "thailand",
    "bangkok",
    "phuket",
    "bali",
    "indonesia",
    "jakarta",
    "vietnam",
    "hanoi",
    "ho chi minh",
    "cambodia",
    "siem reap",
    "angkor",
    "laos",
    "myanmar",
    "yangon",
    "philippines",
    "manila",
    "cebu",
    "japan",
    "tokyo",
    "osaka",
    "korea",
    "seoul",
    "china",
    "beijing",
    "shanghai",
    "taiwan",
    "taipei",
    "india",
    "delhi",
    "mumbai",
    "dubai",
    "uae",
    "saudi",
    "egypt",
    "turkey",
    "france",
    "paris",
    "italy",
    "rome",
    "germany",
    "berlin",
    "australia",
    "sydney",
    "new zealand",
    "united states",
    "usa",
    "uk",
    "london",
    "england",
    "scotland",
    "ireland",
  ];

  return blockedTerms.some((term) => normalizedValue.includes(term));
}
