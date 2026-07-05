import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../../css/index.scss';
import './common/CustomElement';
import ErrorDialog from './common/ErrorDialog';
import UserDropdown from './user/UserDropdown';
import Block from './common/Block';
import DsList from './ds/DsList';
import DsTable from './ds/DsTable';
import Viz from './visualization/Viz';
import Footer from './common/Footer';
import DsDialog from './ds/DsDialog';
import DsToolbox from './ds/DsToolbox';
import VizToolbox from './visualization/VizToolbox';
import {
  defaultDsInfo,
  DsInfoActionType,
  reduceDsInfo
} from '../reducer/dsInfo-reducer';
import { CellType, DsInfo, DsMeta } from '../model/ds';
import { useQueuedRequest } from '../hook/queued-hook';
import { getMeta, isMetaFinal } from '../helper/data-helper';
import {
  defaultDsDialogState,
  reduceDsDialogState
} from '../reducer/dsDialog-reducer';

const SPAContent = () => {

  const [searchParams, setSearchParams] = useSearchParams();
  const [err, setErr] = React.useState<string>();
  const [ds, setDs] = React.useState<any[]>([]);
  const [dsInfo, dispatchDsInfo] = React.useReducer(reduceDsInfo, defaultDsInfo);
  const [dsDialogState, dispatchDsDialogState] = React.useReducer(reduceDsDialogState, defaultDsDialogState);

  const updateDsMetaTimeoutHandlerRef = React.useRef<NodeJS.Timeout | null>(null);

  function propagateDsInfoToURL(dsInfo: DsInfo) {
    const params: { [p: string]: string; } = {};
    if (dsInfo.meta.id) {
      params.id = dsInfo.meta.id;
      const anchor = searchParams.get('anchor');
      if (anchor && dsInfo.meta.id === searchParams.get('id')) {
        params.anchor = anchor;
      }
    }
    setSearchParams(params);
  }

  function propagateAnchorToURL(anchor: CellType) {
    const params: { [p: string]: string; } = {};
    const dsId = searchParams.get('id');
    if (dsId) {
      params.id = dsId;
    }
    if (anchor) {
      params.anchor = JSON.stringify(anchor);
    }
    setSearchParams(params);
  }

  function updateDsMeta({ dsId }: { dsId: string | undefined }) {
    if (!dsId) {
      return Promise.resolve();
    }
    return getMeta(dsId)
        .then((meta) => {
          dispatchDsInfo({
            type: DsInfoActionType.UPDATE_META_SUCCESS,
            meta,
          });
          if (!isMetaFinal(meta)) {
            updateDsMetaTimeoutHandlerRef.current = setTimeout(() => updateDsMeta({ dsId }), 1000);
          }
        })
        .catch((err) => {
          dispatchDsInfo({
            type: DsInfoActionType.UPDATE_META_ERROR,
            err: err.toString(),
          })
        });
  }

  useEffect(() => {
    const dsId = searchParams.get('id');
    if (dsId) {
      const anchor = searchParams.get('anchor');
      dispatchDsInfo({
        type: DsInfoActionType.SELECT_DS,
        meta: { id: dsId },
        anchor: anchor && JSON.parse(anchor),
      });
    }
  }, []);

  useEffect(() => {
    propagateDsInfoToURL(dsInfo);
  }, [dsInfo.meta.id]);

  useQueuedRequest({ dsId: dsInfo.meta.id }, updateDsMeta, [dsInfo.meta.id]);

  useEffect(() => {
    if (updateDsMetaTimeoutHandlerRef.current) {
      clearTimeout(updateDsMetaTimeoutHandlerRef.current);
    }
  }, [dsInfo.meta.id]);

  ErrorDialog.raise = setErr;
  ErrorDialog.close = () => setErr(undefined);

  const titles = [
    'My handicapped pet project....',
    'Let steal the beggars!',
  ];
  const choose = Math.floor(Math.random() * titles.length);
  const title = titles[choose];

  const b1HeightInit = Math.min(300, Math.max(200, Math.floor(window.innerHeight / 3)));
  const [b1Height, setB1Height] = React.useState(b1HeightInit);
  const [b2Height, setB2Height] = React.useState<number | 'auto'>('auto');
  return React.useMemo(() => <div className="content">
    <ErrorDialog err={err}/>
    <DsDialog dsInfo={dsInfo} dispatchDsInfo={dispatchDsInfo} state={dsDialogState} dispatchState={dispatchDsDialogState}/>

    <UserDropdown/>
    <h1>
      {title}
    </h1>
    <wired-divider/>

    <div className="block-container-vertical">
      <Block
          id="ds"
          style={{ minHeight: '200px', overflow: 'visible' }}
          className="block block-container-vertical"
          size={`${b1HeightInit}px`} splitter="horizontal"
          allowCollapse={false}
          onSizeChanged={setB1Height}
      >
        <h2>1. Get the data</h2>
        <DsToolbox dispatchState={dispatchDsDialogState}/>
        <DsList
            dsId={dsInfo.meta.id}
            onDsSelected={(meta: DsMeta) => {
              dispatchDsInfo({
                type: DsInfoActionType.SELECT_DS,
                meta
              });
            }}
        />
        <DsTable
            style={{ height: `${Math.max(b1Height, 200) - 122}px` }}
            dsId={dsInfo.meta.id}
            dsInfo={dsInfo}
            dispatchDsInfo={dispatchDsInfo}
            onLoadDs={setDs}
            ds={ds}
            onSelectCell={propagateAnchorToURL}
        />
      </Block>

      {dsInfo.meta.id && <Block
          id="viz" size="auto"
          splitter="horizontal"
          onSizeChanged={setB2Height}
      >
        <h2>2. Visualize</h2>
        <VizToolbox dispatchState={dispatchDsDialogState}/>
        <Viz
            style={{ height: typeof b2Height == 'number' ? `${b2Height - 68}px` : 'auto' }}
            dsId={dsInfo.meta.id}
            dsInfo={dsInfo}
            dispatchDsInfo={dispatchDsInfo}
        />
      </Block>}
    </div>
    <Footer/>
  </div>, [err, ds, dsInfo, dsDialogState, b1Height, b2Height]);
};

export default SPAContent;
