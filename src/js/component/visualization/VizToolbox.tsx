import React, { Dispatch } from 'react';
import Toolbox, { ToolboxButton } from '../common/Toolbox';
import Icon from '../../icon/Icon';
import {
  DsDialogAction,
  DsDialogActionType
} from '../../reducer/dsDialog-reducer';

interface VizToolboxProps {
  dispatchState: Dispatch<DsDialogAction>;
}

/**
 * Toolbox to manage visualization
 * @param props
 * @constructor
 */
const VizToolbox = (props: VizToolboxProps) => {
  const { dispatchState } = props;

  return <>
    <Toolbox>
      <ToolboxButton
          src={Icon.fileJson}
          alt="Visualization"
          title="Edit visualization query"
          onClick={() => dispatchState({
            type: DsDialogActionType.OPEN,
            tab: 'visualization',
          })}
      />
    </Toolbox>
  </>;
}

export default VizToolbox;
