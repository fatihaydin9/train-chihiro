import * as THREE from 'three';
import {
  CABIN_WIDTH, CABIN_HEIGHT, CABIN_DEPTH, CABIN_WALL_THICK,
  CABIN_FLOOR_Y, TRACK_GAUGE,
} from '../utils/constants';

/** Procedural brushed-metal canvas texture. */
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
    const n = (Math.random() - 0.5) * 12;
    ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, baseR + n)) | 0},${Math.max(0, Math.min(255, baseG + n)) | 0},${Math.max(0, Math.min(255, baseB + n)) | 0})`;
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Helper: rounded-rect THREE.Path. */
function roundedRectPath(
  left: number, bottom: number, width: number, height: number, radius: number,
): THREE.Path {
  const r = Math.min(radius, width / 2, height / 2);
  const right = left + width;
  const top = bottom + height;
  const p = new THREE.Path();
  p.moveTo(left + r, bottom);
  p.lineTo(right - r, bottom);
  p.quadraticCurveTo(right, bottom, right, bottom + r);
  p.lineTo(right, top - r);
  p.quadraticCurveTo(right, top, right - r, top);
  p.lineTo(left + r, top);
  p.quadraticCurveTo(left, top, left, top - r);
  p.lineTo(left, bottom + r);
  p.quadraticCurveTo(left, bottom, left + r, bottom);
  return p;
}

/**
 * Locomotive cabin — front (windshield) faces -Z (train travel direction).
 * Back wall faces +Z. Modern white/metallic interior.
 *
 * Layout along Z axis:
 *   Z: -3.0 ——— -0.4 ——— +3.0
 *      [DRIVING]  [WALL]  [LIVING AREA]
 */
export class CabinSetup {
  readonly group = new THREE.Group();

  constructor() {
    const floorY = CABIN_FLOOR_Y;
    const halfW = CABIN_WIDTH / 2;
    const halfD = CABIN_DEPTH / 2;
    const wt = CABIN_WALL_THICK;

    // ====================================================================
    // MATERIALS — modern white/metallic palette
    // ====================================================================
    const floorTex = createMetalTexture(200, 200, 205);
    floorTex.repeat.set(4, 8);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4, metalness: 0.2 });

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xF2F2F0, roughness: 0.6, metalness: 0.05 }); // clean white
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xF5F5F3, roughness: 0.5, metalness: 0.05 });

    const winFrameMat = new THREE.MeshStandardMaterial({ color: 0x3A3A3E, roughness: 0.3, metalness: 0.6 }); // dark metal frame
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.35, metalness: 0.5 }); // subtle metallic trim

    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.15, roughness: 0.05, metalness: 0.1, depthWrite: false });

    const consoleMat = new THREE.MeshStandardMaterial({ color: 0x2A2A2E, roughness: 0.4, metalness: 0.5 }); // dark console
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.5, metalness: 0.5 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x555558, roughness: 0.5, metalness: 0.5 });
    const leverMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.6 });
    const gaugeMat = new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.5, metalness: 0.5 });
    const buttonRedMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6, metalness: 0.2, emissive: 0xcc3333, emissiveIntensity: 0.15 });
    const buttonGreenMat = new THREE.MeshStandardMaterial({ color: 0x33cc33, roughness: 0.6, metalness: 0.2, emissive: 0x33cc33, emissiveIntensity: 0.15 });
    const buttonYellowMat = new THREE.MeshStandardMaterial({ color: 0xcccc33, roughness: 0.6, metalness: 0.2, emissive: 0xcccc33, emissiveIntensity: 0.15 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x1a1410 });

    const chairMat = new THREE.MeshStandardMaterial({ color: 0x333338, roughness: 0.6, metalness: 0.2 }); // dark charcoal
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.15, metalness: 0.8 }); // chrome accents

    // Living area materials
    const bedFrameMat = new THREE.MeshStandardMaterial({ color: 0xE8E8E5, roughness: 0.5, metalness: 0.15 }); // white frame
    const mattressMat = new THREE.MeshStandardMaterial({ color: 0x3A3A50, roughness: 0.9, metalness: 0.0 }); // dark navy
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xF5F5F5, roughness: 0.95, metalness: 0.0 });
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x505065, roughness: 0.85, metalness: 0.0 }); // muted blue-grey

    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xF0F0ED, roughness: 0.5, metalness: 0.1 }); // white cabinet
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x606065, roughness: 0.25, metalness: 0.3 }); // dark stone
    const stoveTopMat = new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.2, metalness: 0.7 });
    const burnerMat = new THREE.MeshBasicMaterial({ color: 0xFF5500 });

    const rugMat = new THREE.MeshStandardMaterial({ color: 0x6A6A70, roughness: 0.9, metalness: 0.0 });
    const nightstandMat = new THREE.MeshStandardMaterial({ color: 0xE5E5E2, roughness: 0.5, metalness: 0.1 });

    const lanternBodyMat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.2, metalness: 0.6 });
    const lanternGlowMat = new THREE.MeshBasicMaterial({ color: 0xFFCC66 });


    // ====================================================================
    // 1. FLOOR — modern light metallic
    // ====================================================================
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(CABIN_WIDTH, wt, CABIN_DEPTH),
      floorMat,
    );
    floor.position.set(0, floorY, 0);
    floor.receiveShadow = true;
    this.group.add(floor);

    // Subtle floor grid lines
    const gridMat = new THREE.MeshStandardMaterial({ color: 0xBBBBC0, roughness: 0.5, metalness: 0.1 });
    for (let i = 0; i < 12; i++) {
      const z = -halfD + 0.25 + i * (CABIN_DEPTH / 12);
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(CABIN_WIDTH - 0.15, 0.002, 0.008),
        gridMat,
      );
      line.position.set(0, floorY + wt / 2 + 0.001, z);
      this.group.add(line);
    }

    // Metal trim along side walls
    for (const side of [-1, 1]) {
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.06, CABIN_DEPTH - 0.1),
        trimMat,
      );
      trim.position.set(side * (halfW - wt / 2 - 0.015), floorY + wt / 2 + 0.03, 0);
      this.group.add(trim);
    }

    // ====================================================================
    // 2. CEILING — clean white + thin metal rails
    // ====================================================================
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(CABIN_WIDTH, wt, CABIN_DEPTH),
      ceilingMat,
    );
    ceiling.position.set(0, floorY + CABIN_HEIGHT, 0);
    this.group.add(ceiling);

    // 3 thin ceiling rails
    for (let i = 0; i < 3; i++) {
      const z = -halfD + 1.5 + i * 1.8;
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(CABIN_WIDTH - 0.1, 0.03, 0.04),
        trimMat,
      );
      rail.position.set(0, floorY + CABIN_HEIGHT - wt / 2 - 0.015, z);
      this.group.add(rail);
    }

    // ====================================================================
    // 3. SIDE WALLS — single large rounded-rect panoramic window each
    // ====================================================================
    this.buildSideWall(-halfW, 1, wallMat, winFrameMat, glassMat, floorY, halfD, wt);
    this.buildSideWall(halfW, -1, wallMat, winFrameMat, glassMat, floorY, halfD, wt);

    // ====================================================================
    // 4. BACK WALL (+Z) — clean white + small rounded window
    // ====================================================================
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(CABIN_WIDTH, CABIN_HEIGHT, wt),
      wallMat,
    );
    backWall.position.set(0, floorY + CABIN_HEIGHT / 2, halfD);
    this.group.add(backWall);

    // Small rounded square window
    const sqWinSize = 0.35;
    const sqWinGlass = new THREE.Mesh(
      new THREE.BoxGeometry(sqWinSize, sqWinSize, wt + 0.02),
      glassMat,
    );
    sqWinGlass.position.set(0, floorY + CABIN_HEIGHT * 0.6, halfD);
    this.group.add(sqWinGlass);

    // Window frame pieces
    const sqFrameThick = 0.04;
    for (const [sx, sy, sw, sh] of [
      [0, sqWinSize / 2 + sqFrameThick / 2, sqWinSize + sqFrameThick * 2, sqFrameThick],
      [0, -(sqWinSize / 2 + sqFrameThick / 2), sqWinSize + sqFrameThick * 2, sqFrameThick],
      [-(sqWinSize / 2 + sqFrameThick / 2), 0, sqFrameThick, sqWinSize],
      [sqWinSize / 2 + sqFrameThick / 2, 0, sqFrameThick, sqWinSize],
    ] as [number, number, number, number][]) {
      const piece = new THREE.Mesh(
        new THREE.BoxGeometry(sw, sh, 0.03),
        winFrameMat,
      );
      piece.position.set(sx, floorY + CABIN_HEIGHT * 0.6 + sy, halfD - wt / 2 - 0.01);
      this.group.add(piece);
    }

    // ====================================================================
    // 5. FRONT WALL (-Z) — panoramic windshield (same geometry)
    // ====================================================================
    const frontZ = -halfD;
    const sillHeight = 0.55;
    const headerHeight = 0.25;
    const pillarW = 0.15;
    const cornerR = 0.35;
    const winBottom = floorY + sillHeight;
    const winTop = floorY + CABIN_HEIGHT - headerHeight;
    const winHeight = winTop - winBottom;
    const winCenterY = (winBottom + winTop) / 2;

    const wallShape = new THREE.Shape();
    wallShape.moveTo(-halfW, 0);
    wallShape.lineTo(halfW, 0);
    wallShape.lineTo(halfW, CABIN_HEIGHT);
    wallShape.lineTo(-halfW, CABIN_HEIGHT);
    wallShape.closePath();

    const winL = -halfW + pillarW;
    const winR = halfW - pillarW;
    const winB = sillHeight;
    const winT = sillHeight + winHeight;
    const rc = cornerR;
    wallShape.holes.push(roundedRectPath(winL, winB, winR - winL, winT - winB, rc));

    const frontWallGeo = new THREE.ExtrudeGeometry(wallShape, { depth: wt, bevelEnabled: false });
    const frontWallMesh = new THREE.Mesh(frontWallGeo, darkMetalMat);
    frontWallMesh.position.set(0, floorY, frontZ - wt / 2);
    this.group.add(frontWallMesh);

    // Inner bezel
    const bezelThick = 0.04;
    const bezelShape = new THREE.Shape();
    const outerPath = roundedRectPath(winL, winB, winR - winL, winT - winB, rc);
    bezelShape.moveTo(winL + rc, winB);
    for (const curve of outerPath.curves) {
      if (curve instanceof THREE.LineCurve) {
        bezelShape.lineTo(curve.v2.x, curve.v2.y);
      } else if (curve instanceof THREE.QuadraticBezierCurve) {
        bezelShape.quadraticCurveTo(curve.v1.x, curve.v1.y, curve.v2.x, curve.v2.y);
      }
    }
    const brc = Math.max(rc - bezelThick, 0.05);
    bezelShape.holes.push(roundedRectPath(
      winL + bezelThick, winB + bezelThick,
      (winR - winL) - bezelThick * 2, (winT - winB) - bezelThick * 2, brc,
    ));

    const bezelGeo = new THREE.ExtrudeGeometry(bezelShape, { depth: 0.03, bevelEnabled: false });
    const bezelMesh = new THREE.Mesh(bezelGeo, winFrameMat);
    bezelMesh.position.set(0, floorY, frontZ + wt / 2 - 0.005);
    this.group.add(bezelMesh);

    // Center divider pillar
    const fwDivider = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, winHeight - 0.1, wt + 0.02),
      winFrameMat,
    );
    fwDivider.position.set(0, winCenterY, frontZ);
    this.group.add(fwDivider);

    // ====================================================================
    // 6. CONTROL DASHBOARD
    // ====================================================================
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

    const deskLip = new THREE.Mesh(
      new THREE.BoxGeometry(deskWidth, 0.25, 0.05),
      consoleMat,
    );
    deskLip.position.set(0, deskY - 0.13, deskZ + deskDepth / 2);
    this.group.add(deskLip);

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

    // Levers
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
      handle.rotation.x = 0.2;
      this.group.add(handle);
      const knob = new THREE.Mesh(leverKnobGeo, chromeMat);
      knob.position.set(lx, deskY + deskHeight / 2 + 0.13, deskZ - 0.1);
      this.group.add(knob);
    }

    // Gauges
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

    // Buttons
    const buttonGeo = new THREE.BoxGeometry(0.03, 0.02, 0.03);
    const buttonMats = [buttonRedMat, buttonGreenMat, buttonYellowMat];
    for (let i = 0; i < 3; i++) {
      const bx = -0.8 + i * 0.08;
      const button = new THREE.Mesh(buttonGeo, buttonMats[i]);
      button.position.set(bx, deskY + deskHeight / 2 + 0.01, deskZ + 0.05);
      this.group.add(button);
    }

    // Monitor
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.2, 0.02),
      screenMat,
    );
    screen.position.set(0.05, deskY + deskHeight / 2 + 0.12, deskZ - 0.2);
    screen.rotation.x = 0.3;
    this.group.add(screen);
    const monitorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.24, 0.03),
      darkMetalMat,
    );
    monitorFrame.position.set(0.05, deskY + deskHeight / 2 + 0.12, deskZ - 0.21);
    monitorFrame.rotation.x = 0.3;
    this.group.add(monitorFrame);

    // ====================================================================
    // 8. CAPTAIN'S CHAIR (dark charcoal + chrome)
    // ====================================================================
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
        chromeMat,
      );
      support.position.set(side * 0.25, floorY + 0.47, deskZ + 0.55);
      this.group.add(support);
    }

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.35, 8),
      chromeMat,
    );
    pedestal.position.set(0, floorY + wt / 2 + 0.175, deskZ + 0.6);
    this.group.add(pedestal);

    // ====================================================================
    // 9. BED (right wall +X, living area)
    // ====================================================================
    const bedX = halfW - wt - 0.39;
    const bedZ1 = 0.3;
    const bedZ2 = 2.6;
    const bedLen = bedZ2 - bedZ1;
    const bedW = 0.78;
    const bedMidZ = (bedZ1 + bedZ2) / 2;
    const bedBaseH = 0.35;
    const bedBaseY = floorY + wt / 2 + bedBaseH / 2;

    const bedBase = new THREE.Mesh(
      new THREE.BoxGeometry(bedW, bedBaseH, bedLen),
      bedFrameMat,
    );
    bedBase.position.set(bedX, bedBaseY, bedMidZ);
    this.group.add(bedBase);

    const mattressH = 0.12;
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(bedW - 0.06, mattressH, bedLen - 0.06),
      mattressMat,
    );
    mattress.position.set(bedX, bedBaseY + bedBaseH / 2 + mattressH / 2, bedMidZ);
    this.group.add(mattress);

    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.08, 0.3),
      pillowMat,
    );
    pillow.position.set(bedX, bedBaseY + bedBaseH / 2 + mattressH + 0.04, bedZ1 + 0.25);
    this.group.add(pillow);

    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(bedW - 0.04, 0.04, bedLen * 0.55),
      blanketMat,
    );
    blanket.position.set(bedX, bedBaseY + bedBaseH / 2 + mattressH + 0.02, bedMidZ + bedLen * 0.15);
    this.group.add(blanket);

    const headboard = new THREE.Mesh(
      new THREE.BoxGeometry(bedW, 0.5, 0.06),
      bedFrameMat,
    );
    headboard.position.set(bedX, bedBaseY + bedBaseH / 2 + 0.25, bedZ1 - 0.01);
    this.group.add(headboard);

    const footboard = new THREE.Mesh(
      new THREE.BoxGeometry(bedW, 0.2, 0.06),
      bedFrameMat,
    );
    footboard.position.set(bedX, bedBaseY + bedBaseH / 2 + 0.1, bedZ2 + 0.01);
    this.group.add(footboard);

    // ====================================================================
    // 10. KITCHEN (left wall -X)
    // ====================================================================
    const kitchenX = -halfW + wt / 2 + 0.275;
    const kitZ1 = 0.2;
    const kitZ2 = 2.5;
    const kitLen = kitZ2 - kitZ1;
    const kitDepth = 0.55;
    const kitMidZ = (kitZ1 + kitZ2) / 2;
    const cabinetH = 0.7;
    const cabinetY = floorY + wt / 2 + cabinetH / 2;

    const lowerCabinet = new THREE.Mesh(
      new THREE.BoxGeometry(kitDepth, cabinetH, kitLen),
      cabinetMat,
    );
    lowerCabinet.position.set(kitchenX, cabinetY, kitMidZ);
    this.group.add(lowerCabinet);

    const counterH = 0.04;
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(kitDepth + 0.04, counterH, kitLen + 0.04),
      counterMat,
    );
    counter.position.set(kitchenX, cabinetY + cabinetH / 2 + counterH / 2, kitMidZ);
    this.group.add(counter);

    const stoveW = 0.4;
    const stoveD = 0.35;
    const stoveH = 0.03;
    const stoveZ = kitZ1 + 0.4;
    const stoveY = cabinetY + cabinetH / 2 + counterH + stoveH / 2;
    const stove = new THREE.Mesh(
      new THREE.BoxGeometry(stoveW, stoveH, stoveD),
      stoveTopMat,
    );
    stove.position.set(kitchenX, stoveY, stoveZ);
    this.group.add(stove);

    for (let i = 0; i < 2; i++) {
      const bz = stoveZ - 0.07 + i * 0.14;
      const burner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.005, 12),
        burnerMat,
      );
      burner.position.set(kitchenX, stoveY + stoveH / 2 + 0.003, bz);
      this.group.add(burner);
    }

    // Cabinet handles (chrome)
    const handleGeo = new THREE.BoxGeometry(0.02, 0.06, 0.02);
    for (let i = 0; i < 3; i++) {
      const hz = kitZ1 + 0.4 + i * 0.7;
      if (hz > kitZ2 - 0.2) break;
      const h = new THREE.Mesh(handleGeo, chromeMat);
      h.position.set(kitchenX + kitDepth / 2 + 0.015, cabinetY + 0.1, hz);
      this.group.add(h);
    }

    // ====================================================================
    // 11. NIGHTSTAND + LANTERN
    // ====================================================================
    const nsX = bedX - bedW / 2 - 0.2;
    const nsZ = bedZ1 + 0.15;
    const nsW = 0.3;
    const nsH = 0.4;
    const nsD = 0.3;
    const nsY = floorY + wt / 2 + nsH / 2;

    const nightstand = new THREE.Mesh(
      new THREE.BoxGeometry(nsW, nsH, nsD),
      nightstandMat,
    );
    nightstand.position.set(nsX, nsY, nsZ);
    this.group.add(nightstand);

    const nsHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.02, 0.02),
      chromeMat,
    );
    nsHandle.position.set(nsX, nsY, nsZ + nsD / 2 + 0.012);
    this.group.add(nsHandle);

    // Modern lantern
    const lanternBaseY = nsY + nsH / 2;
    const lanternBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.03, 8),
      lanternBodyMat,
    );
    lanternBase.position.set(nsX, lanternBaseY + 0.015, nsZ);
    this.group.add(lanternBase);
    const lanternBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.1, 8),
      new THREE.MeshStandardMaterial({ color: 0xFFEEBB, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.0 }),
    );
    lanternBody.position.set(nsX, lanternBaseY + 0.08, nsZ);
    this.group.add(lanternBody);
    const lanternGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      lanternGlowMat,
    );
    lanternGlow.position.set(nsX, lanternBaseY + 0.08, nsZ);
    this.group.add(lanternGlow);
    const lanternTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.04, 0.03, 8),
      lanternBodyMat,
    );
    lanternTop.position.set(nsX, lanternBaseY + 0.145, nsZ);
    this.group.add(lanternTop);

    // Lantern PointLight managed by StoveLight (toggleable)

    // ====================================================================
    // 10. RUG (living area center)
    // ====================================================================
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.01, 1.5),
      rugMat,
    );
    rug.position.set(0.1, floorY + wt / 2 + 0.005, 1.4);
    this.group.add(rug);

    const rugBorderMat = new THREE.MeshStandardMaterial({ color: 0x4A4A50, roughness: 0.9, metalness: 0.05 });
    const rugBorder = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.008, 1.6),
      rugBorderMat,
    );
    rugBorder.position.set(0.1, floorY + wt / 2 + 0.002, 1.4);
    this.group.add(rugBorder);

    // ====================================================================
    // 14. TRAIN HEADLIGHTS (front of cabin, -Z)
    // ====================================================================
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.6 });
    const headlightLensMat = new THREE.MeshBasicMaterial({ color: 0xFFEECC });
    for (const side of [-1, 1]) {
      // Housing
      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.08, 12),
        headlightMat,
      );
      housing.rotation.x = Math.PI / 2;
      housing.position.set(side * 0.55, floorY + 0.3, -halfD - 0.04);
      this.group.add(housing);
      // Lens
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.01, 12),
        headlightLensMat,
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(side * 0.55, floorY + 0.3, -halfD - 0.09);
      this.group.add(lens);
    }

    // ====================================================================
    // 15. UNDERCARRIAGE (unchanged)
    // ====================================================================
    const underY = CABIN_FLOOR_Y - 0.15;

    for (const xOff of [-0.4, 0.4]) {
      const underRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, CABIN_DEPTH + 0.5),
        darkMetalMat,
      );
      underRail.position.set(xOff, underY, 0);
      this.group.add(underRail);
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

  // ======================================================================
  // SIDE WALL — single large rounded-rect panoramic window (like front windshield)
  // ======================================================================
  private buildSideWall(
    xPos: number,
    normalDir: number,
    wallMat: THREE.Material,
    winFrameMat: THREE.Material,
    glassMat: THREE.Material,
    floorY: number,
    _halfD: number,
    wt: number,
  ): void {
    const wallHeight = CABIN_HEIGHT;
    const wallDepth = CABIN_DEPTH;

    // Single panoramic window specs
    const winPadSide = 0.25;      // wall pillar width at front/back
    const winPadBottom = 0.7;     // sill height from floor
    const winPadTop = 0.4;        // header height from ceiling
    const winCornerR = 0.25;      // rounded corner radius

    const winZ1 = -wallDepth / 2 + winPadSide;
    const winZ2 = wallDepth / 2 - winPadSide;
    const winW = winZ2 - winZ1;
    const winB = winPadBottom;                          // relative to floorY
    const winT = wallHeight - winPadTop;                // relative to floorY
    const winH = winT - winB;

    // Wall as Shape+Extrude with rounded-rect hole (Y=vertical, Z=horizontal on wall)
    const wallShape = new THREE.Shape();
    wallShape.moveTo(0, 0);
    wallShape.lineTo(wallDepth, 0);
    wallShape.lineTo(wallDepth, wallHeight);
    wallShape.lineTo(0, wallHeight);
    wallShape.closePath();

    // Window hole (in wall-local coords: X→Z, Y→Y)
    const holeLeft = winPadSide;
    const holeBottom = winPadBottom;
    wallShape.holes.push(roundedRectPath(holeLeft, holeBottom, winW, winH, winCornerR));

    const wallGeo = new THREE.ExtrudeGeometry(wallShape, { depth: wt, bevelEnabled: false });

    // Rotate so the extrude depth goes along X axis
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.rotation.y = -Math.PI / 2;
    // Position: extrude goes in -X after rotation, so offset accordingly
    if (normalDir > 0) {
      // Left wall (xPos = -halfW), normal points +X
      wallMesh.position.set(xPos - wt / 2, floorY, -wallDepth / 2);
    } else {
      // Right wall (xPos = +halfW), normal points -X
      wallMesh.position.set(xPos + wt / 2, floorY, wallDepth / 2);
      wallMesh.rotation.y = Math.PI / 2;
    }
    this.group.add(wallMesh);

    // Glass pane
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, winH - 0.05, winW - 0.05),
      glassMat,
    );
    glass.position.set(
      xPos + normalDir * (wt / 2 + 0.005),
      floorY + winB + winH / 2,
      0,
    );
    this.group.add(glass);

    // Inner bezel frame (rounded rect border on inside face)
    const bezelThick = 0.04;
    const bezelShape = new THREE.Shape();
    const outerPath = roundedRectPath(holeLeft, holeBottom, winW, winH, winCornerR);
    // Trace outer path onto shape
    bezelShape.moveTo(holeLeft + winCornerR, holeBottom);
    for (const curve of outerPath.curves) {
      if (curve instanceof THREE.LineCurve) {
        bezelShape.lineTo(curve.v2.x, curve.v2.y);
      } else if (curve instanceof THREE.QuadraticBezierCurve) {
        bezelShape.quadraticCurveTo(curve.v1.x, curve.v1.y, curve.v2.x, curve.v2.y);
      }
    }
    const innerR = Math.max(winCornerR - bezelThick, 0.05);
    bezelShape.holes.push(roundedRectPath(
      holeLeft + bezelThick, holeBottom + bezelThick,
      winW - bezelThick * 2, winH - bezelThick * 2, innerR,
    ));

    const bezelGeo = new THREE.ExtrudeGeometry(bezelShape, { depth: 0.025, bevelEnabled: false });
    const bezelMesh = new THREE.Mesh(bezelGeo, winFrameMat);
    bezelMesh.rotation.y = -Math.PI / 2;
    if (normalDir > 0) {
      bezelMesh.position.set(xPos + wt / 2 - 0.005, floorY, -wallDepth / 2);
    } else {
      bezelMesh.position.set(xPos - wt / 2 + 0.005, floorY, wallDepth / 2);
      bezelMesh.rotation.y = Math.PI / 2;
    }
    this.group.add(bezelMesh);
  }
}
