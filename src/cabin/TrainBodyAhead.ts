import * as THREE from 'three';
import {
  CABIN_WIDTH, CABIN_HEIGHT, CABIN_DEPTH, CABIN_FLOOR_Y,
  TRAIN_CAR_COUNT, TRAIN_CAR_GAP, TRAIN_CAR_DEPTH,
  TRACK_GAUGE, SA_CAR_DEPTH, SA_CAR_START_Z,
} from '../utils/constants';

/**
 * Train cars trailing behind the locomotive cabin (in +Z direction).
 * The cabin is the lead car — the driver looks forward (-Z) through the
 * windshield at the open track. These trailing cars are visible through
 * the back porthole and side windows.
 */
export class TrainBodyAhead {
  readonly group = new THREE.Group();

  constructor() {
    const carWidth = CABIN_WIDTH - 0.1;
    const carHeight = CABIN_HEIGHT - 0.2;
    const floorY = CABIN_FLOOR_Y;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.6, metalness: 0.4 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2e2e34, roughness: 0.7, metalness: 0.3 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x556677, transparent: true, opacity: 0.4, roughness: 0.2, metalness: 0.0 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.7 });
    const couplingMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.5, metalness: 0.6 });
    const detailMat = new THREE.MeshStandardMaterial({ color: 0x4a4a50, roughness: 0.6, metalness: 0.4 });

    // Start just past the SA car (+Z side)
    let carZ = SA_CAR_START_Z + SA_CAR_DEPTH + TRAIN_CAR_GAP;

    for (let c = 0; c < TRAIN_CAR_COUNT; c++) {
      const carGroup = new THREE.Group();
      const centerZ = carZ + TRAIN_CAR_DEPTH / 2;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(carWidth, carHeight, TRAIN_CAR_DEPTH),
        bodyMat,
      );
      body.position.set(0, floorY + carHeight / 2, centerZ);
      carGroup.add(body);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(carWidth + 0.1, 0.1, TRAIN_CAR_DEPTH + 0.1),
        roofMat,
      );
      roof.position.set(0, floorY + carHeight + 0.05, centerZ);
      carGroup.add(roof);

      for (let w = 0; w < 4; w++) {
        const wz = centerZ - TRAIN_CAR_DEPTH / 2 + 1.0 + w * 1.8;
        for (const side of [-1, 1]) {
          const win = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.4, 0.6),
            windowMat,
          );
          win.position.set(side * (carWidth / 2 + 0.005), floorY + carHeight * 0.55, wz);
          carGroup.add(win);
        }
      }

      for (const side of [-1, 1]) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.04, TRAIN_CAR_DEPTH),
          detailMat,
        );
        strip.position.set(side * (carWidth / 2 + 0.01), floorY + carHeight * 0.3, centerZ);
        carGroup.add(strip);
      }

      const wheelRadius = 0.2;
      const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.08, 10);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelY = CABIN_FLOOR_Y - 0.35;

      for (const bogieOff of [-TRAIN_CAR_DEPTH / 2 + 1.0, TRAIN_CAR_DEPTH / 2 - 1.0]) {
        const bogieZ = centerZ + bogieOff;
        for (const side of [-1, 1]) {
          const wheel = new THREE.Mesh(wheelGeo, wheelMat);
          wheel.position.set(side * (TRACK_GAUGE / 2), wheelY, bogieZ);
          carGroup.add(wheel);
        }
      }

      if (c < TRAIN_CAR_COUNT - 1) {
        const couplingZ = carZ + TRAIN_CAR_DEPTH + TRAIN_CAR_GAP / 2;
        const coupling = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.1, TRAIN_CAR_GAP + 0.2),
          couplingMat,
        );
        coupling.position.set(0, floorY + 0.2, couplingZ);
        carGroup.add(coupling);
      }

      this.group.add(carGroup);
      carZ += TRAIN_CAR_DEPTH + TRAIN_CAR_GAP;
    }
  }
}
