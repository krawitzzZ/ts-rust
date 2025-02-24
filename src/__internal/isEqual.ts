export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    a == null ||
    b == null ||
    typeof a !== "object" ||
    typeof b !== "object"
  ) {
    return false;
  }

  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
    return false;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  if (a instanceof Map && b instanceof Map) {
    return compareMaps(a, b);
  }

  if (a instanceof Set && b instanceof Set) {
    return compareSets(a, b);
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return compareArrays(a, b);
  }

  return compareObjects(
    a as Record<string, unknown>,
    b as Record<string, unknown>,
  );
}

function compareArrays(arrA: unknown[], arrB: unknown[]): boolean {
  if (arrA.length !== arrB.length) return false;
  for (let i = 0; i < arrA.length; i++) {
    if (!isEqual(arrA[i], arrB[i])) return false;
  }
  return true;
}

function compareObjects(
  objA: Record<string, unknown>,
  objB: Record<string, unknown>,
): boolean {
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !isEqual(objA[key], objB[key])
    ) {
      return false;
    }
  }
  return true;
}

function compareSets(setA: Set<unknown>, setB: Set<unknown>): boolean {
  if (setA.size !== setB.size) return false;
  for (const value of setA) {
    if (![...setB].some((b) => isEqual(value, b))) return false;
  }
  return true;
}

function compareMaps(
  mapA: Map<unknown, unknown>,
  mapB: Map<unknown, unknown>,
): boolean {
  if (mapA.size !== mapB.size) return false;
  for (const [key, valueA] of mapA.entries()) {
    if (!mapB.has(key) || !isEqual(valueA, mapB.get(key))) return false;
  }
  return true;
}
