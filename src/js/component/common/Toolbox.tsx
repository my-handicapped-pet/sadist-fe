import React, { useState } from 'react';
import Dropdown from './Dropdown';
import { useDraggable } from '../../hook/draggable-hook';
import Icon from '../../icon/Icon';

interface ToolboxProps {
  allowCollapse?: boolean;
  children?: React.ReactNode;
}

interface ToolboxState {
  collapsed: boolean;
}

interface ToolboxItemProps {
  children?: React.ReactNode;
}

interface ToolboxButtonProps {
  src?: string;
  alt?: string;
  title?: string;
  onClick?: React.EventHandler<React.MouseEvent>;
}

interface ToolboxDropdownProps {
  className?: string;
  src?: string;
  alt?: string;
  title?: string;
  children?: React.ReactNode;
}

interface ToolboxSwitchProps {
  src?: string | { on: string; off: string; };
  alt?: string | { on: string; off: string; };
  title?: string | { on: string; off: string };
  state: 'on' | 'off';
  onClick?: React.EventHandler<React.MouseEvent>;
}

export const ToolboxItem = ({ children }: ToolboxItemProps) => {
  return <div className="toolbox-item">{children}</div>;
}

export const ToolboxButton = ({
                                src,
                                alt,
                                title,
                                onClick
                              }: ToolboxButtonProps) => {
  return <div className="toolbox-item">
    <wired-button onClick={onClick} title={title}>
      <img src={src} alt={alt}/>
    </wired-button>
  </div>;
}

export const ToolboxDropdown = (
    { className, src, alt, title, children }: ToolboxDropdownProps
) => {
  return <div className={`toolbox-item ${className}`}>
    <Dropdown
        toggle={
          <wired-button title={title}>
            <img src={src} alt={alt}/>
          </wired-button>
        }
        content={children}
    />
  </div>;
}

export const ToolboxSwitch = ({
                                src,
                                alt,
                                title,
                                state,
                                onClick
                              }: ToolboxSwitchProps) => {
  src = typeof src == 'string' ? src : src?.[state];
  alt = typeof alt == 'string' ? alt : alt?.[state];
  title = typeof title == 'string' ? title : title?.[state];
  return <div className="toolbox-item">
    <wired-button
        title={title}
        onClick={onClick}
    >
      <img src={src} alt={alt}/>
    </wired-button>
  </div>;
}

const Toolbox = ({ allowCollapse = true, children }: ToolboxProps) => {
  let ref = useDraggable<HTMLDivElement>();

  const [state, setState] = useState<ToolboxState>({ collapsed: false });

  const collapse = () => {
    setState({ ...state, collapsed: !state.collapsed });
  }

  const renderCollapseIcon = () => <wired-button
      className="toolbox-collapse-button"
      onClick={collapse}
  >
    <img src={Icon.dots}/>
  </wired-button>;

  return <div ref={ref} className="toolbox">
    {!state.collapsed && children}
    {allowCollapse && renderCollapseIcon()}
  </div>;
}

export default Toolbox;
