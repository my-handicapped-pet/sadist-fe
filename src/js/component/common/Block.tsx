import React, { useImperativeHandle, useRef, useState } from 'react';
import Splitter from './Splitter';

interface BlockProps extends React.HTMLAttributes<HTMLDivElement> {
  style?: React.CSSProperties;
  className?: string;
  size?: `${number}%` | `${number}px` | 'auto' | 'content' | 0;
  splitter?: 'vertical' | 'horizontal' | 'up' | 'down' | 'right' | 'left';
  allowChangeSize?: boolean;
  allowCollapse?: boolean;
  collapsed?: boolean;
  children?: React.ReactNode;

  onSizeChanged?(size: number): any;

  onCollapsed?(): any;

  onRestored?(): any;
}

export interface BlockElement {
  underlying: HTMLDivElement | null;

  getActualSize(): number | undefined;

  setActualSize(size: number): void;

  collapse(): void;

  restore(): void;
}

/**
 * A block, i.e. a flexbox item. Must be used inside a flexbox
 * container. It's responsible for positioning and sizing of an element,
 * and also of (optional) splitter, to allow a user to change block size
 * on-fly.
 * @param props
 * @param ref
 * @constructor
 */
const Block = React.forwardRef((
    {
      allowChangeSize = true,
      allowCollapse = true,
      children,
      className = 'block',
      collapsed: collapsedInit = false,
      onCollapsed,
      onRestored,
      onSizeChanged,
      size = 'auto',
      splitter,
      style = {},
      ...rest
    }: BlockProps,
    ref: React.ForwardedRef<BlockElement>,
) => {

  const [actualSize, setActualSize] = useState<number | undefined>();
  const [collapsed, setCollapsed] = useState(collapsedInit);

  if (collapsed) {
    size = 0;
  } else if (typeof actualSize == 'number') {
    size = `${actualSize}px`;
  }

  const divRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(ref, () => ({
    underlying: divRef.current,

    getActualSize() {
      return isVertical ?
          divRef.current?.getBoundingClientRect().width :
          divRef.current?.getBoundingClientRect().height;
    },

    setActualSize(size: number) {
      setActualSize(size);
    },

    collapse() {
      setCollapsed(true);
    },

    restore() {
      setCollapsed(false);
    },
  }));

  let flex: string;
  if (size == 'auto') {
    flex = 'auto';
  } else if (size == 'content') {
    flex = '0 0 auto';
  } else {
    flex = `0 0 ${size}`;
  }

  const isVertical = splitter == 'vertical' || splitter == 'right' || splitter == 'left';
  const isReverse = splitter == 'up' || splitter == 'left';

  function renderSplitter() {
    return <Splitter
        orientation={isVertical ? 'vertical' : 'horizontal'}
        title={allowCollapse && collapsed && 'double click to restore' || undefined}
        onSplit={!allowChangeSize || collapsed ? () => {
        } : (delta) => {
          let currentSize = ( isVertical ?
              divRef.current?.getBoundingClientRect().width :
              divRef.current?.getBoundingClientRect().height ) || 0;
          let newSize = isReverse ? currentSize - delta : currentSize + delta;
          setActualSize(newSize);
          onSizeChanged?.(newSize);
        }}
        onDoubleClick={!allowCollapse ? undefined : () => {
          setCollapsed(!collapsed);
          !collapsed ? onCollapsed?.() : onRestored?.();
        }}
    />;
  }

  return <>
    {splitter && isReverse && renderSplitter()}
    <div
        {...rest}
        ref={divRef}
        className={className}
        style={{ ...style, flex }}
    >
      {children}
    </div>
    {splitter && !isReverse && renderSplitter()}
  </>;
});

export default Block;
