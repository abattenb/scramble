// Dictionary for word validation
// We'll load this from dict.txt at runtime

let dictionary: Set<string> | null = null;

export async function loadDictionary(): Promise<Set<string>> {
  if (dictionary) return dictionary;
  
  try {
    const response = await fetch('/dict.txt');
    const text = await response.text();
    const words = text
      .split(/\r?\n/)  // Handle both Windows and Unix line endings
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length > 0);
    
    dictionary = new Set(words);
    console.log(`Dictionary loaded with ${dictionary.size} words`);
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
  const normalizedWord = word.toLowerCase();
  const isValid = dictionary.has(normalizedWord);
  console.log(`Validating word "${normalizedWord}": ${isValid}`);
  return isValid;
}

export function getDictionary(): Set<string> | null {
  return dictionary;
}
