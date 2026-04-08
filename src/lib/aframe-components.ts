if (typeof window !== 'undefined' && (window as any).AFRAME) {
  const AFRAME = (window as any).AFRAME;
  const THREE = (window as any).THREE;

  if (!AFRAME.components['fit-frustum']) {
    AFRAME.registerComponent('fit-frustum', {
      init: function () {
        window.addEventListener('resize', () => this.fitToCamera());
        this.fitToCamera();
      },
      fitToCamera: function () {
        const el = this.el;
        const sceneEl = el.sceneEl;
        const camera = sceneEl.camera;
        if (!camera) {
          sceneEl.addEventListener('camera-set-active', () => this.fitToCamera());
          return;
        }
        const distance = camera.el.object3D.position.y - el.object3D.position.y;
        const vFov = (camera.fov * Math.PI) / 180;
        const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
        const aspect = window.innerWidth / window.innerHeight;
        const visibleWidth = visibleHeight * aspect;
        el.setAttribute('width', visibleWidth);
        el.setAttribute('height', visibleHeight);
      }
    });
  }

  if (!AFRAME.components['mouse-tracker']) {
    AFRAME.registerComponent('mouse-tracker', {
      init: function () {
        this.mouseWorldPos = new THREE.Vector3(0, 0, 0);
      },
      tick: function () {
        const raycaster = this.el.components.raycaster;
        if (raycaster && raycaster.intersections.length > 0) {
          this.mouseWorldPos.copy(raycaster.intersections[0].point);
        }
      }
    });
  }

  if (!AFRAME.components['dynamic-pillar-grid']) {
    AFRAME.registerComponent('dynamic-pillar-grid', {
      schema: {
        width: { default: 1.5 },
        depth: { default: 1.5 },
        height: { default: 10 },
        spacing: { default: 0.2 }
      },
      init: function () {
        this.pillars = [];
        window.addEventListener('resize', () => this.updateGrid());
        setTimeout(() => this.updateGrid(), 100);
      },
      updateGrid: function () {
        const frustumPlane = document.querySelector('[fit-frustum]');
        if (!frustumPlane) return;
        const vWidth = parseFloat(frustumPlane.getAttribute('width') || '0');
        const vHeight = parseFloat(frustumPlane.getAttribute('height') || '0');
        const colWidth = this.data.width + this.data.spacing;
        const rowDepth = this.data.depth + this.data.spacing;
        let cols = Math.floor(vWidth / colWidth) + 2;
        if (cols % 2 === 0) cols++;
        let rows = Math.floor(vHeight / rowDepth) + 2;
        if (rows % 2 === 0) rows++;
        const totalNeeded = cols * rows;
        while (this.pillars.length > totalNeeded) {
          const p = this.pillars.pop();
          p.parentNode.removeChild(p);
        }
        while (this.pillars.length < totalNeeded) {
          const p = document.createElement('a-box');
          p.setAttribute('width', this.data.width.toString());
          p.setAttribute('depth', this.data.depth.toString());
          p.setAttribute('height', this.data.height.toString());
          p.setAttribute('color', '#808080');
          p.setAttribute('metalness', '0.5');
          p.setAttribute('roughness', '0.5');
          p.setAttribute('distance-checker', '');
          this.el.appendChild(p);
          this.pillars.push(p);
        }
        const offsetX = (cols - 1) * colWidth / 2;
        const offsetZ = (rows - 1) * rowDepth / 2;
        for (let i = 0; i < this.pillars.length; i++) {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const x = (c * colWidth) - offsetX;
          const z = (r * rowDepth) - offsetZ;
          this.pillars[i].setAttribute('position', `${x} 0 ${z}`);
        }
      }
    });
  }

  if (!AFRAME.components['distance-checker']) {
    AFRAME.registerComponent('distance-checker', {
      schema: {
        radius: { default: 5 },
        minElevation: { default: 0 },
        maxElevation: { default: 5 }
      },
      init: function () {
        const cameraEl = document.querySelector('[camera]');
        if (cameraEl) this.tracker = (cameraEl as any).components['mouse-tracker'];
        this.myPos = (this.el as any).object3D.position;
        this.baseY = this.data.minElevation;
      },
      tick: function () {
        if (!this.tracker || !this.tracker.mouseWorldPos) return;
        const mousePos = this.tracker.mouseWorldPos;
        const dx = mousePos.x - this.myPos.x;
        const dz = mousePos.z - this.myPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        let influence = Math.max(0, 1 - (dist / this.data.radius));
        influence = influence * influence;
        const targetY = this.baseY - (influence * this.data.maxElevation);
        this.myPos.y = (THREE as any).MathUtils.lerp(this.myPos.y, targetY, 0.1);
      }
    });
  }
}

export {};
