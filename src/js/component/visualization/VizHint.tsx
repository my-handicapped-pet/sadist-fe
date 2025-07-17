import React, { Dispatch } from 'react';
import moment from 'moment/moment';
import CountDown from './CountDown';
import { DsInfo, VizGraphMeta } from '../../model/ds';
import { DsInfoAction, DsInfoActionType } from '../../reducer/dsInfo-reducer';

interface VizHintProps {
  dsInfo: DsInfo;
  dispatchDsInfo: Dispatch<DsInfoAction>;
}

const VizHint: React.FC<VizHintProps> = ({
                                           dsInfo,
                                           dispatchDsInfo
                                         }: VizHintProps) => {
  // check error
  if (dsInfo.err) {
    return <div className="error">
      <p>Failed to get status ({dsInfo.err}). Please
        refresh the page. </p>
    </div>;
  }

  // display status of classification
  let hint: JSX.Element;
  let { classification, detailization } = dsInfo.meta;
  if (classification?.status !== 'finished') {
    const p1 = <p key="p1">Please wait while data classification
      is done. </p>;
    if (classification?.status) {
      const p2text = `Status: ${classification.status}`;
      if (classification.started && classification.estimated) {
        let finished_estimation = moment(classification.started)
            .add(classification.estimated, 'millisecond')
        const countDown = CountDown({ to: finished_estimation });
        hint = <countDown.Render
            before={
              <>
                {p1}
                <p key="p2">{p2text} (
                  <countDown.Clock/>
                  left)
                </p>
              </>
            }
            after={<p>Seems classification needs too much
              time or it's hung, please contact &nbsp;
              <a
                  href="mailto:kzerby@gmail.com"
                  target="_blank"> developer
              </a>
            </p>}
        />;
      } else {
        hint = <>
          {p1}
          <p key="p2">{p2text}</p>
        </>
      }
    } else {
      hint = p1;
    }

    return <div>{hint}</div>;
  }

  // display status of columns detailization
  if (!detailization) {
    hint = <p>Unfortunately, no columns are recognized as known
      data type. </p>;
  } else {
    const detailizationByCol = Object.entries(detailization);
    const p1 =
        detailizationByCol.find((kv) => kv[1].status === 'finished') ?
            <p key="p1">Following columns can be used in visualisation: </p> :
            <p key="p1">Please wait while columns analysis is done. </p>;

    const colStatus =
        <ul>
          {
            detailizationByCol.map(([col, details]) => {
              let status: JSX.Element;
              if (details.status !== 'finished') {
                status = <>{details.status}</>;
              } else {
                status = <>
                  {
                    dsInfo.vizMetaProposedByCol?.[col]
                        // only show graphs, not points
                        ?.filter((vizMeta) => (vizMeta as VizGraphMeta).type)
                        ?.map((vizMeta, i) => {
                          const link = <a
                              key={vizMeta.key}
                              className="bare"
                              onClick={() => dispatchDsInfo({
                                type: DsInfoActionType.ADD_VIZ,
                                vizMeta
                              })}>{vizMeta.stringrepr}
                          </a>
                          return i == 0 ? link : <>, {link}</>;
                        })
                  }
                </>
              }
              return <li key={col}> {col}: {status}</li>;
            })
          }
        </ul>;

    hint = <>
      {p1}
      <p key="p2">{colStatus}</p>
    </>;
  }

  return <div>{hint}</div>;
}

export default VizHint;
