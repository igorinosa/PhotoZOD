import { cullingSession } from './cullingSession';
import { preloadNext } from './preload';

export function goNext() {
  const id = cullingSession.next();
  preloadNext();
  return id;
}

export function goPrev() {
  const id = cullingSession.prev();
  preloadNext();
  return id;
}

export function goTo(index: number) {
  cullingSession.setIndex(index);
  preloadNext();
  return cullingSession.current();
}
