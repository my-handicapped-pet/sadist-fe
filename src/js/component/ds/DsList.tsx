import React, { useContext, useEffect, useRef, useState } from 'react';
import { WiredCombo } from '/wired-elements/lib/wired-combo';
import ErrorDialog from "../common/ErrorDialog";
import Icon from "../../icon/Icon";
import DsNew from "./DsNew";
import Dialog, { DialogButton } from "../common/Dialog";
import QuickFileUpload from './QuickFileUpload';
import { isVal } from "../../helper/wired-helper";
import { listMeta } from '../../helper/data-helper';
import { DsMeta } from '../../model/ds';
import UserContext from '../../context/UserContext';

interface DsListProps {
  dsId?: string;
  onLoadList?: (dsList: DsMeta[]) => any;
  onDsSelected: (dsMeta: DsMeta) => any;
}

interface DsListState {
  list: DsMeta[];
  loading: boolean;
  creatingNew?: boolean;
  index: { [dsId: string]: DsMeta };
  newItem?: DsMeta;
}

/**
 * list existing data source using /ls api
 * @param props
 * @constructor
 */
const DsList = (props: DsListProps) => {
  const [state, setState] = useState<DsListState>({
    list: [],
    loading: true,
    index: {},
  });

  const { dsId, onLoadList, onDsSelected } = props;

  const comboRef = useRef<WiredCombo | null>(null);

  const userContextValue = useContext(UserContext);

  useEffect(() => {
    if (userContextValue.loaded) {
      listMeta()
          .then((list) => {
            let index: { [dsId: string]: DsMeta } = {}
            list.forEach((v: DsMeta) => {
              index[v.id!] = v;
            });

            setState({
              ...state,
              list,
              index,
              loading: false
            });
            onLoadList?.(list);
          }).catch((err) => {
        ErrorDialog.raise(err.toString());
      });
    }
  }, [userContextValue.user, userContextValue.loaded]);

  useEffect(() => {
    if (state.newItem) {
      onDsSelected(state.newItem);
    }
  }, [state.newItem]);

  function onComboValueSelected(value: string, _event: CustomEvent) {
    // special handling for creating new ds
    if (value === 'new') {
      setState({ ...state, creatingNew: true });
      return;
    }

    // pass DS list record (meta information about DS)
    const meta = state.index[value] || { id: value };
    onDsSelected(meta);
  }

  const onDsCreated = (item: DsMeta) => {
    let newState: DsListState = { ...state, creatingNew: undefined };

    // add {id, name} to the list (or request the list
    // from the server again - dunno what's better).
    const { id, name } = item;

    if (!id || !name) {
      ErrorDialog.raise('Got invalid item from server: ' + JSON.stringify(item));
    } else {
      let list = state.list;
      // remove item with the same name, if any, (if we already uploaded
      // this data source, probably should ask to override/rename)
      list = list.filter(item => item.name !== name);
      // add new item
      list = [...list, item];
      newState = {
        ...newState,
        list,
        index: { ...state.index, [id]: item }, /*to simulate callback*/
        newItem: item,
      };
    }

    setState(newState);
  }

  const onCancelDsCreate = () => {
    setState({ ...state, creatingNew: undefined });
  }

  function renderItem(item: DsMeta) {
    let pic, alt;
    if (item.type === 'New') {
      pic = Icon.plus;
      alt = '[+]';
    } else if (item.extra?.access?.type === 'public') {
      pic = Icon.file;
      alt = '[o]';
    } else {
      pic = Icon.filePrivate;
      alt = '[x]';
    }
    return <wired-item
        key={item.id}
        value={item.id}>
      <img className="item" src={pic} alt={alt}/>
      {item.name}
    </wired-item>;
  }

  const { loading, list, creatingNew } = state;

  return <>
    <Dialog className="new-dialog"
            open={creatingNew} buttons={[DialogButton.FULL, DialogButton.CLOSE]}
            onClose={onCancelDsCreate}>
      <DsNew onDsCreated={onDsCreated}/>
    </Dialog>
    <wired-combo
        ref={comboRef}
        style={{ width: '200px', maxWidth: '100%', marginLeft: '10px' }}
        placeholder="Choose data source..."
        disabled={isVal(loading)}
        selected={dsId}
        onselected={(e: CustomEvent) => onComboValueSelected(e.detail?.selected, e)}
    >
      {renderItem({ id: 'new', 'name': 'New', type: 'New' })}
      {list.map(renderItem)}
    </wired-combo>
    {!dsId && <QuickFileUpload onDsCreated={onDsCreated}>
      ...or drop a spreadsheet here
    </QuickFileUpload>}
  </>
}

export default DsList;
