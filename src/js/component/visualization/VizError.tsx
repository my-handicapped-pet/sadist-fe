import React from 'react';
import { VizGraphMeta } from '../../model/ds';

interface VizErrorProps {
  meta: VizGraphMeta;
  message: string;
}

const VizError = (props: VizErrorProps) => {
  const { meta, message } = props;

  return <div className="error">
    <p>Error: <strong>{message}</strong> occured while rendering graph:</p>
    <pre>{JSON.stringify(meta)}</pre>
  </div>;
}

export default VizError;
