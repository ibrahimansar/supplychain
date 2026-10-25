import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import ReactFlowTreeViewer from './ReactFlowTreeViewer';

const ReactFlowTreeViewerWrapper = (props) => {
  return (
    <div className="w-full h-full tree-viewer" style={{ position: 'relative' }}>
      <ReactFlowProvider>
        <ReactFlowTreeViewer {...props} />
      </ReactFlowProvider>
    </div>
  );
};

export default ReactFlowTreeViewerWrapper;
