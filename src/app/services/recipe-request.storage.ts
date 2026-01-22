const REQUEST_ID_KEY = 'activeRecipeRequestId';

export function storeRequestId(id: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(REQUEST_ID_KEY, id);
  } catch (err) {
    console.warn('Unable to persist request id', err);
  }
}

export function clearStoredRequestId(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.removeItem(REQUEST_ID_KEY);
  } catch (err) {
    console.warn('Unable to clear request id', err);
  }
}

export function getStoredRequestId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.sessionStorage.getItem(REQUEST_ID_KEY);
  } catch {
    return null;
  }
}
