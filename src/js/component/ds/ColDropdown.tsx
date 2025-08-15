import React, { Dispatch, useRef } from 'react';
import Icon from '../../icon/Icon';
import Dropdown, { DropdownElement } from '../common/Dropdown';
import { DsInfoAction, DsInfoActionType } from '../../reducer/dsInfo-reducer';
import { DsInfo } from '../../model/ds';

interface ColFilterProps {
  col: string;
  dsInfo: DsInfo;
  dispatchDsInfo: Dispatch<DsInfoAction>;
}

const ColDropdown = (
    {
      col,
      dsInfo,
      dispatchDsInfo
    }: ColFilterProps
) => {
  const vizMetaProposed = dsInfo.vizMetaProposedByCol?.[col];
  const filters = dsInfo.filtersByCol?.[col];

  const dropdownRef = useRef<DropdownElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const fixDropdownContentPosition = (open: boolean) => {
    // the horizontal scroll pinpoint. TODO consider more reliable selector
    const tableOuterDiv = document.querySelector('#ds>div>div:nth-child(2)');

    function doFix() {
      const scrollX = tableOuterDiv?.scrollLeft ?? 0;
      const scrollY = window.scrollY;
      if (contentRef.current) {
        contentRef.current.style.transform = `translate(${-scrollX}px,${-scrollY}px)`;
      }
    }

    // remove old listeners, if any
    if (fixDropdownContentPositionRef.current) {
      window.removeEventListener('scroll', fixDropdownContentPositionRef.current);
      ( tableOuterDiv as HTMLDivElement )?.removeEventListener('scroll', fixDropdownContentPositionRef.current);
      fixDropdownContentPositionRef.current = undefined;
    }

    if (open) {
      // fix immediately on dropdown open
      doFix();

      // fix on scroll
      fixDropdownContentPositionRef.current = doFix;
      window.addEventListener('scroll', doFix);
      ( tableOuterDiv as HTMLDivElement )?.addEventListener('scroll', doFix);
    }
  }

  const fixDropdownContentPositionRef = useRef<() => void>();

  const renderVizProposal = () => {
    if (!vizMetaProposed) {
      return null;
    }

    return <div className="col-dropdown-pane-item" key="viz">
      <span className="col-action-hint">Visualize:</span>
      <wired-listbox
          style={{ width: '100%' }}
          multiselect={true}
          onselected={(event) => {
            const addVizMetas = vizMetaProposed?.filter((m) => event.detail.selected.includes(m.key));
            const removeVizMetas = vizMetaProposed?.filter((m) => event.detail.unselected.includes(m.key));
            dispatchDsInfo({
              type: DsInfoActionType.APPEND_VIZ,
              addVizMetas,
              removeVizMetas,
            });
            // dropdownRef.current?.collapse();
          }}
      >
        {
          vizMetaProposed.map(vizMeta => ( <wired-item
              key={vizMeta.key}
              value={vizMeta.key}
              selected={dsInfo.isVizSelected(vizMeta)}
          >
            {vizMeta.stringrepr}
          </wired-item> ))
        }
      </wired-listbox>
    </div>;
  }

  const renderFilterProposal = () => {
    if (!filters) {
      return null;
    }

    return <div className="col-filter-pane-item" key="filter">
      {filters.map((filter) => (
          <filter.render
              // @ts-ignore  TS can't calculate this :(
              filter={filter}
              onFilter={() => {
                dispatchDsInfo({ type: DsInfoActionType.APPLY_FILTER });
              }}
          />
      ))}
    </div>;
  }

  const isSelected = !!filters?.find(f => f.q());
  const icon = isSelected ? Icon.filterSelected : Icon.filter;

  return <Dropdown
      ref={dropdownRef}
      className="col-dropdown"
      toggle={<img className="col-icon" src={icon} alt={''}/>}
      content={<div ref={contentRef} className="col-dropdown-content">
        <span className="col-action-title">{col}</span>
        {renderVizProposal()}
        {renderFilterProposal()}
      </div>}
      onToggle={fixDropdownContentPosition}
  />;
}

export default ColDropdown;
