import React, { useImperativeHandle, useRef, useState } from 'react';
import { WiredInput } from '/wired-elements/lib/wired-input';
import Toolbox, {
  ToolboxButton,
  ToolboxDropdown,
  ToolboxItem, ToolboxSwitch
} from '../common/Toolbox';
import Icon from '../../icon/Icon';
import { WebCrawlerScriptTemplate } from '../../webcrawler-model/webcrawler';

export interface ScriptToolboxProps {
  template?: WebCrawlerScriptTemplate;

  executeScript(): any;

  lockScript(): any;

  unlockScript(): any;
}

export interface ScriptToolboxState {
  executor: 'local' | 'proxy';
  isSaveTemplate: boolean;
  isLocked: boolean;
}

export function ScriptToolbox(props: ScriptToolboxProps,
                              ref: React.Ref<ScriptToolboxState>) {
  const { template, executeScript, lockScript, unlockScript } = props;

  const [state, setState] = useState<ScriptToolboxState>({
    executor: 'local',
    isSaveTemplate: true,
    isLocked: true,
  });

  useImperativeHandle(ref, () => state);

  const templateNameInputRef = useRef<WiredInput | null>(null);

  return <Toolbox>
    <ToolboxItem>
      <wired-combo
          selected={state.executor}
          onselected={(e) => {
            setState({ ...state, executor: e.detail.selected });
          }}
      >
        <wired-item value="local">in Browser</wired-item>
        <wired-item value="proxy">on Proxy Server</wired-item>
      </wired-combo>
    </ToolboxItem>
    <ToolboxButton src={Icon.run} alt=">" title="Run" onClick={executeScript}/>
    <ToolboxDropdown src={Icon.gear} alt="Settings" title="Settings">
      <wired-checkbox
          checked={state.isSaveTemplate}
          onchange={(event) => {
            setState({ ...state, isSaveTemplate: event.detail.checked });
          }}
      ><span className="comment">Also save template as</span>
      </wired-checkbox>
      <wired-input
          ref={(input) => {
            if (input) {
              templateNameInputRef.current = input;
              setTimeout(() => {
                input.value = template!.name;
                input.focus();
              }, 100);
            }
          }}
          style={{ width: '200px' }}
          onchange={() => {
            if (template)
              template.name = templateNameInputRef.current!.value;
          }}
      ></wired-input>
    </ToolboxDropdown>
    <ToolboxSwitch
        src={{ on: Icon.lockOn, off: Icon.lockOff }}
        alt={{ on: 'Edit script', off: 'Lock script' }}
        title={{ on: 'Unlock', off: 'Lock' }}
        state={state.isLocked ? 'on' : 'off'}
        onClick={() => {
          if (state.isLocked) {
            unlockScript();
            setState({ ...state, isLocked: false });
          } else {
            lockScript();
            setState({ ...state, isLocked: true });
          }
        }}
    />
  </Toolbox>;
}

export default React.forwardRef(ScriptToolbox);
