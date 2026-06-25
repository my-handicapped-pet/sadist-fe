import React, { Dispatch, useEffect, useImperativeHandle, useRef } from 'react';
import Dialog, { DialogButton } from '../common/Dialog';
import ObjectEditor, { ObjectEditorInterface } from '../common/ObjectEditor';
import Block from '../common/Block';
import { DsInfoAction, DsInfoActionType } from '../../reducer/dsInfo-reducer';
import {
  DsDialogAction,
  DsDialogActionType,
  DsDialogState,
  Tab
} from '../../reducer/dsDialog-reducer';
import { DsInfo } from '../../model/ds';

interface DsDialogProps {
  dsInfo: DsInfo;
  dispatchDsInfo: Dispatch<DsInfoAction>;
  state: DsDialogState;
  dispatchState: Dispatch<DsDialogAction>;
}

interface TabInterface {
  save(): boolean;
}

const __FilteringTab = ({
                          dsInfo,
                          dispatchDsInfo,
                          state,
                          dispatchState
                        }: DsDialogProps, ref: React.ForwardedRef<TabInterface>) => {
  const schema = require('/json_schema/filters.json');
  const editorRef = useRef<ObjectEditorInterface | null>(null);

  useImperativeHandle(ref, () => ( {
    save(): boolean {
      return editorRef.current!.save();
    }
  } ));

  useEffect(() => {
    if (state.open && state.tab === 'filtering') {
      setTimeout(() => {
        // Have to have focus after timeout, because
        // otherwise it doesn't work
        let editor = editorRef.current;
        if (editor) {
          // Fold "values" cos they are huge blocks...
          const lines = editor.findAll('"values":').map(pos => pos[0]);
          editor.unfoldAll();
          editor.fold(lines);
          editor.focus();
        }
      }, 100);
    }
  }, [state.open, state.tab]);

  return <ObjectEditor
      id="filtering"
      className="object-editor-block"
      obj={dsInfo.filters}
      schema={schema}
      ref={editorRef}
      onChanging={() => {
        dispatchState({ type: DsDialogActionType.CHANGED, tab: 'filtering' });
      }}
      onChanged={(filters: any) => {
        dispatchDsInfo({
          type: DsInfoActionType.SET_FILTERS,
          filters,
        });
        dispatchState({ type: DsDialogActionType.SAVED, tab: 'filtering' });
      }}
      onUnchanged={() => {
        dispatchState({ type: DsDialogActionType.SAVED, tab: 'filtering' });
      }}
  />;
}

const FilteringTab = React.forwardRef(__FilteringTab);

const __VisualizationTab = (
    {
      dsInfo,
      dispatchDsInfo,
      state,
      dispatchState
    }: DsDialogProps, ref: React.ForwardedRef<TabInterface>
) => {
  const schema = require('/json_schema/viz.json');
  const editorRef = useRef<ObjectEditorInterface | null>(null);

  useImperativeHandle(ref, () => ( {
    save(): boolean {
      return editorRef.current!.save();
    }
  } ));

  useEffect(() => {
    if (state.open && state.tab === 'visualization') {
      setTimeout(() => {
        const editor = editorRef.current;
        if (editor) {
          editor.focus();
        }
      }, 100);
    }
  }, [state.open, state.tab]);

  return <ObjectEditor
      id="visualization"
      className="object-editor-block"
      obj={dsInfo.vizMeta}
      schema={schema}
      ref={editorRef}
      onChanging={() => {
        dispatchState({
          type: DsDialogActionType.CHANGED,
          tab: 'visualization'
        });
      }}
      onChanged={(vizMeta: any) => {
        dispatchDsInfo({
          type: DsInfoActionType.SET_VIZ,
          vizMeta,
        });
        dispatchState({ type: DsDialogActionType.SAVED, tab: 'visualization' });
      }}
      onUnchanged={() => {
        dispatchState({ type: DsDialogActionType.SAVED, tab: 'visualization' });
      }}
  />;
}

const VisualizationTab = React.forwardRef(__VisualizationTab);

/**
 * All dialog's tabs to manage DS will be rendered here.
 * They'll be shown/not shown, depending on if a user clicks
 * toolbox menu.
 *
 * @param props
 * @constructor
 */
const DsDialog = (props: DsDialogProps) => {
  const { state, dispatchState } = props;

  // [key, { title, component }]
  const tabList: ( [string, {
    component: React.ForwardRefExoticComponent<React.PropsWithoutRef<DsDialogProps> & React.RefAttributes<TabInterface>>;
    title: string;
  }] )[] = [
    ['filtering', { title: 'Filtering', component: FilteringTab }],
    ['visualization', { title: 'Visualization', component: VisualizationTab }],
  ];

  // {key -> reference}
  const tabRef: { [key in Tab]?: React.MutableRefObject<TabInterface> } =
      Object.fromEntries(tabList.map(([key,]) => [key, useRef(undefined)]));

  function close() {
    dispatchState({ type: DsDialogActionType.CLOSE });
  }

  function save() {
    // save all tabs
    for (const [key, isChanged] of Object.entries(state.changed)) {
      const tab: Tab = key as Tab;
      if (isChanged) {
        if (!tabRef[tab]?.current.save()) {
          // error saving tab, switch to it and return
          dispatchState({ type: DsDialogActionType.SWITCH, tab });
          return;
        }
      }
    }

    // all saved, close the dialog
    close();
  }

  return <Dialog
      className="ds-dialog"
      onClose={close}
      open={state.open}
      buttons={[DialogButton.FULL]}
  >
    <Block className="block block-container-vertical">
      <wired-tabs className="block-container-vertical" selected={state.tab}>
        {tabList.map(([key, value]) => {
          const tab = key as Tab;
          return <wired-tab
              key={key}
              className="block-container-vertical"
              name={key}
              label={value.title + ( state.changed[tab] ? '*' : '' )}
          >
            <value.component ref={tabRef[tab]} {...props}/>
          </wired-tab>;
        })}
      </wired-tabs>
    </Block>
    <Block size="content">
      {/*margin-left, margin-right to make it wider.*/}
      <wired-button key="ok" className="nav-button" onClick={() => {
        save();
      }}><strong style={{ marginLeft: '20px', marginRight: '20px' }}>OK</strong>
      </wired-button>
      <wired-button key="cancel" className="nav-button" onClick={() => {
        close();
      }}>Cancel
      </wired-button>
    </Block>
  </Dialog>;
}

export default DsDialog;
