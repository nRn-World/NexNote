import React, { useEffect } from 'react';
import '../lib/aframe-components.ts';

export default function Home3DBackground() {
  useEffect(() => {
    // Ensuring A-Frame scene is correctly initialized if needed
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-auto overflow-hidden">
      {/* 
        Note: We use any here because these are custom A-Frame elements 
        not present in standard JSX intrinsic elements.
      */}
      {(React as any).createElement('a-scene', {
        'xr-mode-ui': 'enabled: false',
        'embedded': '',
        'style': { width: '100%', height: '100%' },
        children: [
          (React as any).createElement('a-camera', {
            'look-controls-enabled': 'false',
            'wasd-controls-enabled': 'false',
            'position': '0 10 0',
            'rotation': '-90 0 0',
            'cursor': 'rayOrigin: mouse',
            'raycaster': 'objects: .receive-ray',
            'mouse-tracker': ''
          }),
          (React as any).createElement('a-plane', {
            'class': 'receive-ray',
            'position': '0 5 0',
            'rotation': '-90 0 0',
            'width': '38.4',
            'height': '21.6',
            'opacity': '0',
            'color': '#000000',
            'fit-frustum': ''
          }),
          (React as any).createElement('a-entity', {
            'dynamic-pillar-grid': 'width: 1.5; depth: 1.5; height: 10; spacing: 0.2'
          }),
          (React as any).createElement('a-light', {
            'position': '0 11 0',
            'type': 'point',
            'intensity': '5'
          }),
          (React as any).createElement('a-sky', {
            'color': '#000000'
          })
        ]
      })}
    </div>
  );
}
