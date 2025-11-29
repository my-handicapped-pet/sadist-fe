import React, { Dispatch } from 'react';
import Toolbox, { ToolboxButton } from '../common/Toolbox';
import Icon from '../../icon/Icon';
import {
  DsDialogAction,
  DsDialogActionType
} from '../../reducer/dsDialog-reducer';

interface DsToolboxProps {
  dispatchState: Dispatch<DsDialogAction>;
}

/**
 * A toolbox to manage DS
 *
 * @param props
 * @constructor
 */
const DsToolbox = (props: DsToolboxProps) => {
  const { dispatchState } = props;

  return <>
    <Toolbox>
      <ToolboxButton
          src={Icon.fileJson}
          alt="Filtering"
          title="Edit filter query"
          onClick={() => dispatchState({ type: DsDialogActionType.OPEN, tab: 'filtering' })}
      />
    </Toolbox>
  </>;
}

export default DsToolbox;
