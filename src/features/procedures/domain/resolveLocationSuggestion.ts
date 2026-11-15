type Input = {
  current: string;
  previousSuggestion: string;
  nextSuggestion: string;
};

export function resolveLocationSuggestion({
  current,
  previousSuggestion,
  nextSuggestion,
}: Input): string {
  const untouched = current.trim() === '' || current === previousSuggestion;
  return untouched ? nextSuggestion : current;
}
