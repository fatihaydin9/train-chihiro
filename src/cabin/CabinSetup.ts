import * as THREE from 'three';
import {
  CABIN_WIDTH, CABIN_HEIGHT, CABIN_DEPTH, CABIN_WALL_THICK,
  CABIN_FLOOR_Y, TRACK_GAUGE,
} from '../utils/constants';

function createMetalTexture(
  baseR: number, baseG: number, baseB: number,
  width = 64, height = 64,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const n = (Math.random() - 0.5) * 20;
    ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, baseR + n)) | 0},${Math.max(0, Math.min(255, baseG + n)) | 0},${Math.max(0, Math.min(255, baseB + n)) | 0})`;
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Locomotive cabin — front (windshield) faces -Z (train travel direction).
 * Back wall faces +Z. Camera sits inside looking through the panoramic glass.
 */
export class CabinSetup {
  readonly group = new THREE.Group();

  constructor() {
    const floorY = CABIN_FLOOR_Y;
    const halfW = CABIN_WIDTH / 2;
    const halfD = CABIN_DEPTH / 2;
    const wt = CABIN_WALL_THICK;

    // Materials — PBR (MeshStandardMaterial), physical glass for windows
    const metalTex = createMetalTexture(70, 72, 75);
    const metalMat = new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.5, metalness: 0.5 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.5, metalness: 0.5 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x555558, roughness: 0.5, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.15, roughness: 0.05, metalness: 0.1 });
    const consoleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.4 });
    const leverMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.6 });
    const gaugeMat = new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.5, metalness: 0.5 });
    const buttonRedMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6, metalness: 0.2 });
    const buttonGreenMat = new THREE.MeshStandardMaterial({ color: 0x33cc33, roughness: 0.6, metalness: 0.2 });
    const buttonYellowMat = new THREE.MeshStandardMaterial({ color: 0xcccc33, roughness: 0.6, metalness: 0.2 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x22aaaa });
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9, metalness: 0.0 });
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.1 });
    const lockerMat = new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.7, metalness: 0.3 });
    const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0xffeecc });
    const portholeMat = new THREE.MeshStandardMaterial({ color: 0x667788, transparent: true, opacity: 0.2, roughness: 0.1, metalness: 0.1 });

    // === FLOOR — metal plate with grating lines ===
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(CABIN_WIDTH, wt, CABIN_DEPTH),
      metalMat,
    );
    floor.position.set(0, floorY, 0);
    floor.receiveShadow = true;
    this.group.add(floor);

    for (let i = 0; i < 8; i++) {
      const z = -halfD + 0.5 + i * (CABIN_DEPTH / 8);
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(CABIN_WIDTH - 0.1, 0.005, 0.02),
        darkMetalMat,
      );
      line.position.set(0, floorY + wt / 2 + 0.003, z);
      this.group.add(line);
    }

    for (const side of [-1, 1]) {
      const conduit = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, CABIN_DEPTH - 0.3),
        cableMat,
      );
      conduit.position.set(side * (halfW - 0.1), floorY + wt / 2 + 0.02, 0);
      this.group.add(conduit);
    }

    // === CEILING ===
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(CABIN_WIDTH, wt, CABIN_DEPTH),
      metalMat,
    );
    ceiling.position.set(0, floorY + CABIN_HEIGHT, 0);
    this.group.add(ceiling);

    // === SIDE WALLS ===
    this.buildSideWall(-halfW, 1, metalMat, frameMat, glassMat, floorY, halfD, wt);
    this.buildSideWall(halfW, -1, metalMat, frameMat, glassMat, floorY, halfD, wt);

    // === BACK WALL (+Z side, solid with small porthole) ===
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(CABIN_WIDTH, CABIN_HEIGHT, wt),
      metalMat,
    );
    backWall.position.set(0, floorY + CABIN_HEIGHT / 2, halfD);
    this.group.add(backWall);

    const porthole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, wt + 0.02, 16),
      portholeMat,
    );
    porthole.rotation.x = Math.PI / 2;
    porthole.position.set(0, floorY + CABIN_HEIGHT * 0.6, halfD);
    this.group.add(porthole);

    const portholeFrame = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.02, 8, 16),
      frameMat,
    );
    portholeFrame.position.set(0, floorY + CABIN_HEIGHT * 0.6, halfD - wt / 2 - 0.01);
    this.group.add(portholeFrame);

    // === FRONT WALL (-Z side, panoramic windshield) ===
    const sillHeight = 0.55;
    const headerHeight = 0.15;
    const pillarW = 0.07;
    const winHeight = CABIN_HEIGHT - sillHeight - headerHeight;
    const winWidth = CABIN_WIDTH - pillarW * 2;

    // Bottom sill (hidden behind dashboard)
    const frontBottom = new THREE.Mesh(
      new THREE.BoxGeometry(CABIN_WIDTH, sillHeight, wt),
      metalMat,
    );
    frontBottom.position.set(0, floorY + sillHeight / 2, -halfD);
    this.group.add(frontBottom);

    // Top header visor
    const frontTop = new THREE.Mesh(
      new THREE.BoxGeometry(CABIN_WIDTH, headerHeight, wt),
      darkMetalMat,
    );
    frontTop.position.set(0, floorY + CABIN_HEIGHT - headerHeight / 2, -halfD);
    this.group.add(frontTop);

    // A-pillars
    const aPillarL = new THREE.Mesh(
      new THREE.BoxGeometry(pillarW, winHeight, wt),
      frameMat,
    );
    aPillarL.position.set(-halfW + pillarW / 2, floorY + sillHeight + winHeight / 2, -halfD);
    this.group.add(aPillarL);

    const aPillarR = new THREE.Mesh(
      new THREE.BoxGeometry(pillarW, winHeight, wt),
      frameMat,
    );
    aPillarR.position.set(halfW - pillarW / 2, floorY + sillHeight + winHeight / 2, -halfD);
    this.group.add(aPillarR);

    // Windshield — open (no glass, unobstructed view)

    // === CONTROL DASHBOARD (against front wall, facing +Z toward operator) ===
    const deskWidth = CABIN_WIDTH - 0.15;
    const deskDepth = 0.7;
    const deskHeight = 0.08;
    const deskY = floorY + 0.75;
    const deskZ = -halfD + deskDepth / 2 + 0.02;

    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(deskWidth, deskHeight, deskDepth),
      consoleMat,
    );
    desk.position.set(0, deskY, deskZ);
    this.group.add(desk);

    // Front apron (operator-facing side = +Z side of desk)
    const deskLip = new THREE.Mesh(
      new THREE.BoxGeometry(deskWidth, 0.25, 0.05),
      consoleMat,
    );
    deskLip.position.set(0, deskY - 0.13, deskZ + deskDepth / 2);
    this.group.add(deskLip);

    // Side returns
    for (const side of [-1, 1]) {
      const sideReturn = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, deskHeight + 0.25, deskDepth * 0.5),
        consoleMat,
      );
      sideReturn.position.set(
        side * (deskWidth / 2 - 0.04),
        deskY - 0.08,
        deskZ + deskDepth * 0.15,
      );
      this.group.add(sideReturn);
    }

    // === LEVERS (3) — on window side of desk (-Z offset from deskZ) ===
    const leverBaseGeo = new THREE.BoxGeometry(0.04, 0.02, 0.04);
    const leverHandleGeo = new THREE.BoxGeometry(0.02, 0.12, 0.02);
    const leverKnobGeo = new THREE.BoxGeometry(0.04, 0.03, 0.03);
    for (let i = 0; i < 3; i++) {
      const lx = -0.5 + i * 0.25;
      const base = new THREE.Mesh(leverBaseGeo, darkMetalMat);
      base.position.set(lx, deskY + deskHeight / 2 + 0.01, deskZ - 0.1);
      this.group.add(base);

      const handle = new THREE.Mesh(leverHandleGeo, leverMat);
      handle.position.set(lx, deskY + deskHeight / 2 + 0.07, deskZ - 0.1);
      handle.rotation.x = 0.2; // tilts toward operator (+Z)
      this.group.add(handle);

      const knob = new THREE.Mesh(leverKnobGeo, frameMat);
      knob.position.set(lx, deskY + deskHeight / 2 + 0.13, deskZ - 0.1);
      this.group.add(knob);
    }

    // === GAUGES (2) — on window side ===
    const gaugeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16);
    for (let i = 0; i < 2; i++) {
      const gx = 0.3 + i * 0.3;
      const gauge = new THREE.Mesh(gaugeGeo, gaugeMat);
      gauge.rotation.x = Math.PI / 2;
      gauge.position.set(gx, deskY + deskHeight / 2 + 0.01, deskZ - 0.12);
      this.group.add(gauge);

      const face = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.005, 16),
        new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.4, metalness: 0.1 }),
      );
      face.rotation.x = Math.PI / 2;
      face.position.set(gx, deskY + deskHeight / 2 + 0.01, deskZ - 0.10);
      this.group.add(face);

      const needle = new THREE.Mesh(
        new THREE.BoxGeometry(0.005, 0.04, 0.002),
        new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.5, metalness: 0.3 }),
      );
      needle.position.set(gx, deskY + deskHeight / 2 + 0.01, deskZ - 0.095);
      needle.rotation.z = i * 0.5 - 0.3;
      this.group.add(needle);
    }

    // === BUTTONS (3) — on operator side (+Z offset from deskZ) ===
    const buttonGeo = new THREE.BoxGeometry(0.03, 0.02, 0.03);
    const buttonMats = [buttonRedMat, buttonGreenMat, buttonYellowMat];
    for (let i = 0; i < 3; i++) {
      const bx = -0.8 + i * 0.08;
      const button = new THREE.Mesh(buttonGeo, buttonMats[i]);
      button.position.set(bx, deskY + deskHeight / 2 + 0.01, deskZ + 0.05);
      this.group.add(button);
    }

    // === MONITOR SCREEN — toward window, tilted back to face operator ===
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.2, 0.02),
      screenMat,
    );
    screen.position.set(0.05, deskY + deskHeight / 2 + 0.12, deskZ - 0.2);
    screen.rotation.x = 0.3; // tilted toward operator (+Z)
    this.group.add(screen);

    const monitorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.24, 0.03),
      darkMetalMat,
    );
    monitorFrame.position.set(0.05, deskY + deskHeight / 2 + 0.12, deskZ - 0.21);
    monitorFrame.rotation.x = 0.3;
    this.group.add(monitorFrame);

    // === CAPTAIN'S CHAIR — behind desk (+Z side) ===
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.06, 0.45),
      chairMat,
    );
    seat.position.set(0, floorY + 0.5, deskZ + 0.6);
    this.group.add(seat);

    const seatBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.06),
      chairMat,
    );
    seatBack.position.set(0, floorY + 0.78, deskZ + 0.8);
    this.group.add(seatBack);

    for (const side of [-1, 1]) {
      const armrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 0.4),
        chairMat,
      );
      armrest.position.set(side * 0.25, floorY + 0.6, deskZ + 0.6);
      this.group.add(armrest);

      const support = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.12, 0.06),
        darkMetalMat,
      );
      support.position.set(side * 0.25, floorY + 0.47, deskZ + 0.55);
      this.group.add(support);
    }

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.35, 8),
      darkMetalMat,
    );
    pedestal.position.set(0, floorY + wt / 2 + 0.175, deskZ + 0.6);
    this.group.add(pedestal);

    // === OVERHEAD LIGHTS ===
    for (let i = 0; i < 2; i++) {
      const lz = -halfD / 2 + i * halfD;
      const lightPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.03, 0.2),
        lightPanelMat,
      );
      lightPanel.position.set(0, floorY + CABIN_HEIGHT - wt - 0.02, lz);
      this.group.add(lightPanel);
    }

    // === SIDE SHELF (left wall, back half) ===
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.03, 0.25),
      metalMat,
    );
    shelf.position.set(-halfW + wt + 0.27, floorY + CABIN_HEIGHT * 0.45, halfD * 0.3);
    this.group.add(shelf);

    const shelfBracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.15, 0.03),
      frameMat,
    );
    shelfBracket.position.set(-halfW + wt + 0.1, floorY + CABIN_HEIGHT * 0.38, halfD * 0.3);
    this.group.add(shelfBracket);

    // === STORAGE LOCKER (right wall, back half) ===
    const locker = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.6, 0.4),
      lockerMat,
    );
    locker.position.set(halfW - wt - 0.1, floorY + 0.5, halfD * 0.4);
    this.group.add(locker);

    const lockerHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.08, 0.02),
      frameMat,
    );
    lockerHandle.position.set(halfW - wt - 0.03, floorY + 0.55, halfD * 0.4);
    this.group.add(lockerHandle);

    // === UNDERCARRIAGE (symmetric along Z) ===
    const underY = CABIN_FLOOR_Y - 0.15;

    for (const xOff of [-0.4, 0.4]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, CABIN_DEPTH + 0.5),
        darkMetalMat,
      );
      rail.position.set(xOff, underY, 0);
      this.group.add(rail);
    }

    const wheelRadius = 0.2;
    const wheelWidth = 0.08;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 12);
    wheelGeo.rotateZ(Math.PI / 2);

    for (const zOff of [-halfD + 0.6, halfD - 0.6]) {
      const bogie = new THREE.Mesh(
        new THREE.BoxGeometry(TRACK_GAUGE + 0.2, 0.06, 1.0),
        darkMetalMat,
      );
      bogie.position.set(0, underY - 0.1, zOff);
      this.group.add(bogie);

      for (const side of [-1, 1]) {
        const wheel = new THREE.Mesh(wheelGeo, frameMat);
        wheel.position.set(side * (TRACK_GAUGE / 2), CABIN_FLOOR_Y - 0.35, zOff);
        this.group.add(wheel);
      }

      const axle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, TRACK_GAUGE + 0.3, 6),
        darkMetalMat,
      );
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, CABIN_FLOOR_Y - 0.35, zOff);
      this.group.add(axle);
    }
  }

  private buildSideWall(
    xPos: number,
    normalDir: number,
    metalMat: THREE.Material,
    frameMat: THREE.Material,
    glassMat: THREE.Material,
    floorY: number,
    halfD: number,
    wt: number,
  ): void {
    const wallHeight = CABIN_HEIGHT;
    const wallDepth = CABIN_DEPTH;
    const windowWidth = 0.6;
    const windowHeight = 0.5;
    const windowY = floorY + wallHeight * 0.5;
    const windowSpacing = wallDepth * 0.3;

    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(wt, wallHeight, wallDepth),
      metalMat,
    );
    wall.position.set(xPos, floorY + wallHeight / 2, 0);
    this.group.add(wall);

    for (let i = 0; i < 2; i++) {
      const wz = -windowSpacing + i * windowSpacing * 2;

      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, windowHeight, windowWidth),
        glassMat,
      );
      glass.position.set(xPos + normalDir * (wt / 2 + 0.005), windowY, wz);
      this.group.add(glass);

      const frameTop = new THREE.Mesh(
        new THREE.BoxGeometry(wt + 0.02, 0.04, windowWidth + 0.06),
        frameMat,
      );
      frameTop.position.set(xPos, windowY + windowHeight / 2 + 0.02, wz);
      this.group.add(frameTop);

      const frameBottom = new THREE.Mesh(
        new THREE.BoxGeometry(wt + 0.02, 0.04, windowWidth + 0.06),
        frameMat,
      );
      frameBottom.position.set(xPos, windowY - windowHeight / 2 - 0.02, wz);
      this.group.add(frameBottom);
    }
  }
}
