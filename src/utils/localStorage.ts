/**
 * Loads a value from localStorage
 */
export function loadFromStorage<T = string>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    
    // Try to parse as JSON, otherwise return as string
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return null;
  }
}

/**
 * Saves a value to localStorage
 */
export function saveToStorage(key: string, value: any): void {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
}

/**
 * Removes a value from localStorage
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
  }
}
