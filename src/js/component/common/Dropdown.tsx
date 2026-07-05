import React, {
  forwardRef,
  ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';


interface DropdownProps {
  className?: string;
  toggle: ReactNode;
  content: ReactNode;

  /**
   * Fire when user toggles (opens or closes) dropdown
   */
  onToggle?(open: boolean): any;
}

interface DropdownElement {
  open: boolean;

  expand(): void;

  collapse(): void;
}

const Dropdown = forwardRef<DropdownElement, DropdownProps>(
    ({ className = 'dropdown', toggle, content, onToggle }, ref) => {
      const root = useRef<HTMLDivElement | null>(null);
      const dropdown = useRef<HTMLAnchorElement | null>(null);
      const pane = useRef<HTMLDivElement | null>(null);

      const [open, setOpen] = useState(false);

      useImperativeHandle(ref, () => ( {
        open,
        expand: () => setOpen(true),
        collapse: () => setOpen(false),
      } ));

      useEffect(() => {
        if (open) {
          const listener = (event: Event) => {
            if (pane.current && !pane.current.contains(event.target as Node)) {
              setOpen(false);
            }
          };
          document.addEventListener('click', listener);
          return () => document.removeEventListener('click', listener);
        }
        return undefined;
      }, [open]);

      useEffect(() => {
        // relocate filter pane if it happened behind the left boundary of content
        if (root.current && pane.current) {
          const containerElement = root.current.parentElement!;
          const left = containerElement.offsetLeft + root.current.offsetLeft;

          if (left < 0) {
            pane.current.style.left = `${-left}px`;
          }
        }
      }, [root.current, pane.current, open])

      useEffect(() => {
        onToggle?.(open);
      }, [open]);

      const onOpen = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.stopPropagation();
        setOpen(x => !x);
      };

      return <div ref={root} className={className}>
        <div style={{ width: "100%" }}>
          <a ref={dropdown} className="bare" onClick={onOpen}>
            {toggle}
          </a>
        </div>
        {
          open ?
              <div ref={pane} className="pane">
                {content}
              </div> :
              null
        }
      </div>;
    }
);

export default Dropdown;
export { DropdownElement };

