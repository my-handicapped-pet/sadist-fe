import React from 'react';

/**
 * Make a reference to an underlying HTML element,
 * and forward it as a reference to the component
 * @param ref forwarded reference to the component (2nd param of functional component)
 * @param f function to extend the underlying element if needed
 */
export function useRefToForward<E, T extends E = E>(ref: React.ForwardedRef<T>, f?: (e: E) => Omit<T, keyof E>) {
  const elementRef = React.useRef<E | null>(null);

  React.useImperativeHandle(ref, () => {
    let current = elementRef.current as T;
    if (current && f) {
      Object.assign(current, f(current));
    }
    return current;
  });

  return elementRef;
}