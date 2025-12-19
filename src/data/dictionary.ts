// Dictionary for word validation
// We'll load this from dict.txt at runtime

let dictionary: Set<string> | null = null;

export async function loadDictionary(): Promise<Set<string>> {
  if (dictionary) return dictionary;
  
  const startTime = performance.now();
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}dict.txt`);
    const text = await response.text();
    const words = text
      .split(/\r?\n/)  // Handle both Windows and Unix line endings
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length > 0);
    
    dictionary = new Set(words);
    const elapsed = performance.now() - startTime;
    console.log(`Dictionary loaded with ${dictionary.size} words in ${elapsed.toFixed(2)}ms`);
    return dictionary;
  } catch (error) {
    console.error('Failed to load dictionary:', error);
    // Return empty set if loading fails
    dictionary = new Set();
    return dictionary;
  }
}

export function isValidWord(word: string): boolean {
  if (!dictionary) {
    console.warn('Dictionary not loaded yet');
    return false;
  }
  const startTime = performance.now();
  const normalizedWord = word.toLowerCase();
  const isValid = dictionary.has(normalizedWord);
  const elapsed = performance.now() - startTime;
  console.log(`Validating word "${normalizedWord}": ${isValid} (${elapsed.toFixed(3)}ms)`);
  return isValid;
}

export function getDictionary(): Set<string> | null {
  return dictionary;
}
