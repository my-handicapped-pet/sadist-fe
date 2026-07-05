import React from 'react';

export const useDraggable = <T extends HTMLElement>(): React.Ref<T | null> => {
  const ref = React.useRef<T | null>(null);
  const [[offsetX, offsetY], setOffset] = React.useState<[number, number]>([0, 0]);

  // Add handlers
  React.useEffect(() => {
    const node = ref.current;
    if (node) {
      const onDrag = (event: MouseEvent) => {
        if (!( event.buttons & 1 )) {
          return;
        }
        event.preventDefault();
        const [pinpointX, pinpointY] = [event.clientX, event.clientY];
        const onDrop = (event: MouseEvent) => {
          setOffset([offsetX + event.clientX - pinpointX, offsetY + event.clientY - pinpointY]);
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onDrop);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onDrop);
        document.addEventListener('mouseup', onUp);
      };
      node.addEventListener('mousedown', onDrag);
      return () => {
        node.removeEventListener('mousedown', onDrag);
      }
    }

    return undefined;
  }, [ref.current, offsetX, offsetY]);

  // Apply offset
  React.useEffect(() => {
    const node = ref.current;
    if (node) {
      if (offsetX || offsetY) {
        node.style.transform = `translate(${offsetX}px,${offsetY}px)`;
      } else {
        node.style.removeProperty('transform');
      }
    }
  }, [ref.current, offsetX, offsetY]);

  return ref;
}
