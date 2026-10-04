export class LocalStorage {
  static load(key: string): string | null {
    try {
      const val = localStorage.getItem(key);

      return val;
    } catch {
      return null;
    }
  }

  static save(key: string, str: string): void {
    try {
      localStorage.setItem(key, str);
    } catch {
    }
  }

  static delete(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
    }
  }
}
