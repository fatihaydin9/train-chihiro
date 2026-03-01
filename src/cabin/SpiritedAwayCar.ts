import * as THREE from "three";

import {
  CABIN_FLOOR_Y,
  CABIN_HEIGHT,
  CABIN_WALL_THICK,
  CABIN_WIDTH,
  SA_CAR_DEPTH,
  SA_CAR_START_Z,
  TRACK_GAUGE,
  TRAIN_CAR_GAP,
} from "../utils/constants";

/**
 * Spirited Away-style wooden passenger car.
 * Positioned behind the locomotive cabin (+Z direction).
 * Features barrel-vault ceiling, wooden walls with windows,
 * red velvet bench seats, brass poles, hanging rings, and warm amber lighting.
 */
export class SpiritedAwayCar {
  readonly group = new THREE.Group();
  private nfGroup: THREE.Group | null = null;
  private nfBaseY = 0;

  update(_dt: number, elapsed: number): void {
    if (this.nfGroup) {
      const bob =
        Math.sin(elapsed * 1.4) * 0.06 + Math.sin(elapsed * 2.3) * 0.02;
      this.nfGroup.position.y = this.nfBaseY + bob;
    }
  }

  constructor() {
    const floorY = CABIN_FLOOR_Y;
    const wt = CABIN_WALL_THICK;
    const halfW = CABIN_WIDTH / 2;
    const carDepth = SA_CAR_DEPTH;
    const carStart = SA_CAR_START_Z;
    const carCenter = carStart + carDepth / 2;
    const carEnd = carStart + carDepth;

    // ====================================================================
    // MATERIALS
    // ====================================================================
    // Honey-toned wood for walls
    const woodWallMat = new THREE.MeshStandardMaterial({
      color: 0xc4883c,
      roughness: 0.75,
      metalness: 0.05,
    });
    // Dark wood for floor
    const woodFloorMat = new THREE.MeshStandardMaterial({
      color: 0x5a3a1a,
      roughness: 0.8,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    // Red velvet for seats
    const velvetMat = new THREE.MeshStandardMaterial({
      color: 0x8b1a1a,
      roughness: 0.95,
      metalness: 0.0,
    });
    // Brass metal for poles/rings
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc8a84e,
      roughness: 0.3,
      metalness: 0.7,
    });
    // Glass for windows
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity: 0.15,
      roughness: 0.05,
      metalness: 0.1,
      depthWrite: false,
    });
    // Dark metal for undercarriage
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3e,
      roughness: 0.5,
      metalness: 0.5,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x555558,
      roughness: 0.5,
      metalness: 0.5,
    });
    // Ceiling wood (lighter) — DoubleSide so inside of barrel vault is visible
    const ceilingWoodMat = new THREE.MeshStandardMaterial({
      color: 0xd4985c,
      roughness: 0.7,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    // Window frame wood (darker trim)
    const winFrameWoodMat = new THREE.MeshStandardMaterial({
      color: 0x7a5020,
      roughness: 0.6,
      metalness: 0.1,
    });

    // ====================================================================
    // 1. FLOOR — dark wood with plank lines
    // ====================================================================
    const floorThick = 0.3;
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(CABIN_WIDTH, floorThick, carDepth),
      woodFloorMat,
    );
    floor.position.set(0, floorY - floorThick / 2 + wt / 2, carCenter);
    floor.receiveShadow = true;
    this.group.add(floor);

    // Plank lines (lengthwise along Z)
    const plankLineMat = new THREE.MeshStandardMaterial({
      color: 0x3a2510,
      roughness: 0.9,
      metalness: 0.0,
    });
    const plankCount = 8;
    for (let i = 1; i < plankCount; i++) {
      const x = -halfW + (CABIN_WIDTH / plankCount) * i;
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.002, carDepth - 0.1),
        plankLineMat,
      );
      line.position.set(x, floorY + wt / 2 + 0.001, carCenter);
      this.group.add(line);
    }

    // ====================================================================
    // 2. BARREL-VAULT CEILING (Spirited Away style — thin curved shell)
    // ====================================================================
    const totalHeight = CABIN_HEIGHT;
    const vaultR = 3.5; // large radius → gentle arch, starts well above windows
    const vaultThick = 0.06; // thin ceiling shell
    const vaultSegs = 20;
    // Circle center: peak at floorY + CABIN_HEIGHT, edges meet wall tops
    const vaultCenterY = floorY + totalHeight - vaultR;
    // Angle where arch edge meets the wall (x = halfW)
    const edgeAngle = Math.acos(Math.min(halfW / vaultR, 1.0));

    // Build thin arch cross-section in XY plane
    const archShape = new THREE.Shape();
    const outerR = vaultR;
    const innerR = vaultR - vaultThick;
    // Outer arc: right edge → top → left edge
    for (let i = 0; i <= vaultSegs; i++) {
      const t = edgeAngle + (Math.PI - 2 * edgeAngle) * (i / vaultSegs);
      const x = Math.cos(t) * outerR;
      const y = Math.sin(t) * outerR;
      if (i === 0) archShape.moveTo(x, y);
      else archShape.lineTo(x, y);
    }
    // Inner arc: left edge → top → right edge (reverse)
    for (let i = vaultSegs; i >= 0; i--) {
      const t = edgeAngle + (Math.PI - 2 * edgeAngle) * (i / vaultSegs);
      archShape.lineTo(Math.cos(t) * innerR, Math.sin(t) * innerR);
    }
    archShape.closePath();

    const vaultLen = carDepth + 0.1;
    const vaultGeo = new THREE.ExtrudeGeometry(archShape, {
      depth: vaultLen,
      bevelEnabled: false,
    });
    const vaultMesh = new THREE.Mesh(vaultGeo, ceilingWoodMat);
    vaultMesh.position.set(0, vaultCenterY, carStart - 0.05);
    this.group.add(vaultMesh);

    // Decorative wooden ribs across the vault (single box per rib)
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0xa06830,
      roughness: 0.65,
      metalness: 0.1,
    });
    const ribCount = 7;
    for (let i = 0; i < ribCount; i++) {
      const rz = carStart + (carDepth / (ribCount + 1)) * (i + 1);
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(CABIN_WIDTH - 0.1, 0.03, 0.025),
        ribMat,
      );
      rib.position.set(0, vaultCenterY + vaultR - vaultThick - 0.01, rz);
      this.group.add(rib);
    }

    // ====================================================================
    // 3. SIDE WALLS — wood with 5 rectangular window cutouts each
    // ====================================================================
    const wallHeight = CABIN_HEIGHT;
    const winCount = 6;
    const winW = 0.95;
    const winH = 0.95; // square
    const winBottom = 1.25; // a bit higher
    const winSpacing = carDepth / (winCount + 1);

    for (const side of [-1, 1]) {
      // Wall shape with window holes
      const wallShape = new THREE.Shape();
      wallShape.moveTo(0, 0);
      wallShape.lineTo(carDepth, 0);
      wallShape.lineTo(carDepth, wallHeight);
      wallShape.lineTo(0, wallHeight);
      wallShape.closePath();

      for (let i = 0; i < winCount; i++) {
        const wz = winSpacing * (i + 1) - winW / 2;
        const hole = new THREE.Path();
        hole.moveTo(wz, winBottom);
        hole.lineTo(wz + winW, winBottom);
        hole.lineTo(wz + winW, winBottom + winH);
        hole.lineTo(wz, winBottom + winH);
        hole.closePath();
        wallShape.holes.push(hole);
      }

      const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
        depth: wt,
        bevelEnabled: false,
      });
      const wallMesh = new THREE.Mesh(wallGeo, woodWallMat);

      // Rotate so extrude goes along X
      wallMesh.rotation.y = -Math.PI / 2;
      if (side === 1) {
        // Right wall (+X), normal faces -X
        wallMesh.position.set(halfW + wt / 2, floorY, carStart + carDepth);
        wallMesh.rotation.y = Math.PI / 2;
      } else {
        // Left wall (-X), normal faces +X
        wallMesh.position.set(-halfW - wt / 2, floorY, carStart);
      }
      this.group.add(wallMesh);

      // Glass panes for each window
      for (let i = 0; i < winCount; i++) {
        const wz = carStart + winSpacing * (i + 1);
        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(0.01, winH - 0.05, winW - 0.05),
          glassMat,
        );
        glass.position.set(
          side * (halfW + wt / 2 + 0.005),
          floorY + winBottom + winH / 2,
          wz,
        );
        this.group.add(glass);
      }

      // Window frames (top + bottom ledges — same size, flush with wall)
      for (let i = 0; i < winCount; i++) {
        const wz = carStart + winSpacing * (i + 1);
        const frameH = 0.04;
        const frameD = 0.06;
        const frameX = side * (halfW - frameD / 2);
        // Top frame
        const top = new THREE.Mesh(
          new THREE.BoxGeometry(frameD, frameH, winW + 0.04),
          winFrameWoodMat,
        );
        top.position.set(frameX, floorY + winBottom + winH + frameH / 2, wz);
        this.group.add(top);
        // Bottom frame (ledge)
        const bot = new THREE.Mesh(
          new THREE.BoxGeometry(frameD, frameH, winW + 0.04),
          winFrameWoodMat,
        );
        bot.position.set(frameX, floorY + winBottom - frameH / 2, wz);
        this.group.add(bot);
      }
    }

    // ====================================================================
    // 4. FRONT WALL — modern sliding door (matches cabin back wall)
    // ====================================================================
    const doorW = 0.9;
    const doorH = 2.1;

    const frontWallShape = new THREE.Shape();
    frontWallShape.moveTo(-halfW, 0);
    frontWallShape.lineTo(halfW, 0);
    frontWallShape.lineTo(halfW, totalHeight);
    frontWallShape.lineTo(-halfW, totalHeight);
    frontWallShape.closePath();

    // Rectangular door hole
    const frontDoorHole = new THREE.Path();
    frontDoorHole.moveTo(-doorW / 2, 0);
    frontDoorHole.lineTo(-doorW / 2, doorH);
    frontDoorHole.lineTo(doorW / 2, doorH);
    frontDoorHole.lineTo(doorW / 2, 0);
    frontDoorHole.closePath();
    frontWallShape.holes.push(frontDoorHole);

    const frontWallGeo = new THREE.ExtrudeGeometry(frontWallShape, {
      depth: wt,
      bevelEnabled: false,
    });
    const frontWallMesh = new THREE.Mesh(frontWallGeo, woodWallMat);
    frontWallMesh.position.set(0, floorY, carStart - wt / 2);
    this.group.add(frontWallMesh);

    // Modern black door frame
    const doorFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1e,
      roughness: 0.25,
      metalness: 0.6,
    });
    const frameThick = 0.045;
    const frameDepth = wt + 0.03;
    // Left jamb
    const fLeftJamb = new THREE.Mesh(
      new THREE.BoxGeometry(frameThick, doorH, frameDepth),
      doorFrameMat,
    );
    fLeftJamb.position.set(
      -doorW / 2 - frameThick / 2,
      floorY + doorH / 2,
      carStart,
    );
    this.group.add(fLeftJamb);
    // Right jamb
    const fRightJamb = new THREE.Mesh(
      new THREE.BoxGeometry(frameThick, doorH, frameDepth),
      doorFrameMat,
    );
    fRightJamb.position.set(
      doorW / 2 + frameThick / 2,
      floorY + doorH / 2,
      carStart,
    );
    this.group.add(fRightJamb);
    // Top header
    const fTopHeader = new THREE.Mesh(
      new THREE.BoxGeometry(doorW + frameThick * 2, frameThick, frameDepth),
      doorFrameMat,
    );
    fTopHeader.position.set(0, floorY + doorH + frameThick / 2, carStart);
    this.group.add(fTopHeader);
    // Door panels, glass, and handles are on the cabin back wall side only
    // (CabinSetup) to avoid z-fighting between two doors 0.4m apart.

    // ====================================================================
    // 5. BACK WALL — solid wood + small round porthole
    // ====================================================================
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(CABIN_WIDTH, totalHeight, wt),
      woodWallMat,
    );
    backWall.position.set(0, floorY + totalHeight / 2, carEnd);
    this.group.add(backWall);

    // Small round porthole on back wall
    const portholeGlass = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 16),
      glassMat,
    );
    portholeGlass.position.set(
      0,
      floorY + totalHeight * 0.6,
      carEnd + wt / 2 + 0.005,
    );
    this.group.add(portholeGlass);
    const portholeFrame = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.025, 8, 16),
      winFrameWoodMat,
    );
    portholeFrame.position.set(
      0,
      floorY + totalHeight * 0.6,
      carEnd + wt / 2 + 0.01,
    );
    this.group.add(portholeFrame);

    // ====================================================================
    // 6. RED VELVET BENCH SEATS (both sides — Spirited Away style)
    // ====================================================================
    const seatDepth = 0.6;
    const seatBaseH = 0.32;
    const cushionH = 0.1;
    const backrestH = 0.55;
    const backrestThick = 0.08;
    const seatLen = carDepth - 0.6;
    const armrestW = 0.06;

    // Richer red velvet
    const seatVelvetMat = new THREE.MeshStandardMaterial({
      color: 0xa01818,
      roughness: 0.92,
      metalness: 0.0,
    });
    // Slightly darker for backrest shadow
    const backVelvetMat = new THREE.MeshStandardMaterial({
      color: 0x8b1515,
      roughness: 0.95,
      metalness: 0.0,
    });
    // Wood trim for seat frame
    const seatWoodMat = new THREE.MeshStandardMaterial({
      color: 0x6a4420,
      roughness: 0.7,
      metalness: 0.05,
    });

    for (const side of [-1, 1]) {
      const seatX = side * (halfW - wt - seatDepth / 2);
      const seatZ = carCenter;
      const baseTopY = floorY + wt / 2 + seatBaseH;

      // Wood base frame
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(seatDepth, seatBaseH, seatLen),
        seatWoodMat,
      );
      base.position.set(seatX, floorY + wt / 2 + seatBaseH / 2, seatZ);
      this.group.add(base);

      // Wood trim strip along front edge of base
      const frontTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, seatBaseH + cushionH, seatLen + 0.01),
        seatWoodMat,
      );
      frontTrim.position.set(
        seatX - side * (seatDepth / 2 - 0.015),
        floorY + wt / 2 + (seatBaseH + cushionH) / 2,
        seatZ,
      );
      this.group.add(frontTrim);

      // Seat cushion — slightly rounded using a wider box
      const cushion = new THREE.Mesh(
        new THREE.BoxGeometry(seatDepth - 0.06, cushionH, seatLen - 0.02),
        seatVelvetMat,
      );
      cushion.position.set(seatX, baseTopY + cushionH / 2, seatZ);
      this.group.add(cushion);

      // Cushion front lip (rounded feel)
      const lip = new THREE.Mesh(
        new THREE.CylinderGeometry(
          cushionH / 2,
          cushionH / 2,
          seatLen - 0.02,
          8,
        ),
        seatVelvetMat,
      );
      lip.rotation.x = 0;
      lip.position.set(
        seatX - side * (seatDepth / 2 - 0.05),
        baseTopY + cushionH / 2,
        seatZ,
      );
      lip.rotation.x = Math.PI / 2;
      this.group.add(lip);

      // Backrest — thicker, against wall
      const backrest = new THREE.Mesh(
        new THREE.BoxGeometry(backrestThick, backrestH, seatLen - 0.02),
        backVelvetMat,
      );
      backrest.position.set(
        side * (halfW - wt - backrestThick / 2),
        baseTopY + cushionH + backrestH / 2,
        seatZ,
      );
      this.group.add(backrest);

      // Backrest top wood trim
      const backTrim = new THREE.Mesh(
        new THREE.BoxGeometry(backrestThick + 0.02, 0.035, seatLen + 0.01),
        seatWoodMat,
      );
      backTrim.position.set(
        side * (halfW - wt - backrestThick / 2),
        baseTopY + cushionH + backrestH + 0.017,
        seatZ,
      );
      this.group.add(backTrim);

      // Armrests at each end
      for (const endZ of [carStart + 0.32, carEnd - 0.32]) {
        const armrest = new THREE.Mesh(
          new THREE.BoxGeometry(seatDepth - 0.04, backrestH * 0.5, armrestW),
          seatWoodMat,
        );
        armrest.position.set(
          seatX,
          baseTopY + cushionH + backrestH * 0.25,
          endZ,
        );
        this.group.add(armrest);
      }
    }

    // ====================================================================
    // NO-FACE (Kaonashi) — LatheGeometry smooth profile, sitting on bench
    // ====================================================================
    {
      const nfGroup = new THREE.Group();
      const seatTopY = floorY + wt / 2 + seatBaseH + cushionH;
      const nfX = halfW - wt - seatDepth / 2;
      const nfZ = carCenter + 1.5;

      // --- Materials ---
      const solidMat = new THREE.MeshStandardMaterial({
        color: 0x080810,
        roughness: 0.95,
        metalness: 0.0,
      });
      const ghostMat = new THREE.MeshStandardMaterial({
        color: 0x080810,
        roughness: 0.95,
        metalness: 0.0,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const maskMat = new THREE.MeshStandardMaterial({
        color: 0xf0ebe0,
        roughness: 0.25,
        metalness: 0.05,
      });
      const markingMat = new THREE.MeshStandardMaterial({
        color: 0x101010,
        roughness: 0.8,
        metalness: 0.0,
      });
      const purpleMarkMat = new THREE.MeshStandardMaterial({
        color: 0xcca1a1,
        roughness: 0.9,
        metalness: 0.0,
      });

      // === 1. BODY — wide rectangular profile, NO neck, head merges directly ===
      const pts: THREE.Vector2[] = [
        new THREE.Vector2(0.0, -0.5), // center bottom (closed, hangs well below seat)
        new THREE.Vector2(0.3, -0.5), // base tip
        new THREE.Vector2(0.42, -0.35), // widening
        new THREE.Vector2(0.48, -0.18), // expanding
        new THREE.Vector2(0.5, 0.0), // seat level
        new THREE.Vector2(0.5, 0.24), // wide body — rectangular
        new THREE.Vector2(0.49, 0.48), // still wide
        new THREE.Vector2(0.47, 0.66), // barely tapering
        new THREE.Vector2(0.44, 0.82), // slight taper
        new THREE.Vector2(0.4, 0.94), // upper body, still wide
        new THREE.Vector2(0.36, 1.03), // shoulders merge into head
        new THREE.Vector2(0.32, 1.12), // head starts
        new THREE.Vector2(0.3, 1.2), // head
        new THREE.Vector2(0.27, 1.3), // head rounding
        new THREE.Vector2(0.2, 1.39),
        new THREE.Vector2(0.12, 1.46),
        new THREE.Vector2(0.05, 1.51),
        new THREE.Vector2(0.0, 1.54), // top (closed)
      ];
      const bodyGeo = new THREE.LatheGeometry(pts, 28);
      const body = new THREE.Mesh(bodyGeo, solidMat);
      body.position.set(0, seatTopY, 0);
      nfGroup.add(body);

      // === 2. GHOST OVERLAY — slightly larger, transparent ===
      const ghostPts = pts.map((p, i) => {
        if (i === 0 || i === pts.length - 1) return p.clone();
        return new THREE.Vector2(p.x + 0.04, p.y);
      });
      const ghostGeo = new THREE.LatheGeometry(ghostPts, 28);
      const ghost = new THREE.Mesh(ghostGeo, ghostMat);
      ghost.position.set(0, seatTopY, 0);
      nfGroup.add(ghost);

      // Seat spread (dark puddle)
      const spread = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.56, 0.03, 20),
        solidMat,
      );
      spread.position.set(0, seatTopY + 0.015, 0);
      nfGroup.add(spread);

      // === 3. MASK — smaller, pushed forward ===
      const headLocalY = 1.28;
      const headSurfR = 0.3;
      const maskR = 0.22;
      const mask = new THREE.Mesh(
        new THREE.SphereGeometry(maskR, 24, 20),
        maskMat,
      );
      const maskScaleX = 0.22;
      mask.scale.set(maskScaleX, 1.3, 0.85);
      // Push mask well in front of head
      const maskX = -headSurfR - 0.16;
      const maskY = seatTopY + headLocalY;
      mask.position.set(maskX, maskY, 0);
      nfGroup.add(mask);

      // Connecting cone between head and mask — very deep overlap into body
      const maskBackX = maskX + maskR * maskScaleX;
      const pipeStartX = maskBackX - 0.06; // 6cm into mask
      const pipeEndX = 0.0; // all the way to body center
      const pipeLen = Math.abs(pipeStartX - pipeEndX);
      const pipeCenterX = (pipeStartX + pipeEndX) / 2;
      const pipeMaskR = maskR * 1.3; // mask end: match mask Y height
      const pipeHeadR = maskR * 1.3; // body end: same size as mask
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(pipeMaskR, pipeHeadR, pipeLen, 20),
        solidMat,
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(pipeCenterX, maskY, 0);
      nfGroup.add(pipe);

      // === 4. FACE FEATURES ===
      const fx = maskX - maskR * maskScaleX - 0.002;
      const eyeY = maskY + 0.07;
      const eyeSpacing = 0.12;

      // Helper for rounded rectangles (used by mouth)
      const makeRoundRect = (w: number, h: number, r: number) => {
        const s = new THREE.Shape();
        s.moveTo(-w + r, -h);
        s.lineTo(w - r, -h);
        s.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
        s.lineTo(w, h - r);
        s.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
        s.lineTo(-w + r, h);
        s.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
        s.lineTo(-w, -h + r);
        s.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);
        return s;
      };

      // Eyes: ovals
      const eyeGeo = new THREE.CircleGeometry(0.032, 20);
      eyeGeo.rotateY(-Math.PI / 2);
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeo, markingMat);
        eye.scale.set(1.0, 0.55, 1.4); // wide oval
        eye.position.set(fx, eyeY, s * eyeSpacing);
        nfGroup.add(eye);
      }
      const eyeHalfH = 0.032 * 0.55;

      // Soft rounded triangles above each eye (point up)
      {
        const triUp = new THREE.Shape();
        triUp.moveTo(-0.025, 0);
        triUp.quadraticCurveTo(-0.018, 0.06, 0, 0.08);
        triUp.quadraticCurveTo(0.018, 0.06, 0.025, 0);
        triUp.quadraticCurveTo(0, 0.01, -0.025, 0);
        const triGeo = new THREE.ShapeGeometry(triUp, 12);
        triGeo.rotateY(-Math.PI / 2);
        for (const s of [-1, 1]) {
          const tri = new THREE.Mesh(triGeo, purpleMarkMat);
          tri.position.set(fx, eyeY + eyeHalfH + 0.003, s * eyeSpacing);
          nfGroup.add(tri);
        }
      }

      // Soft rounded triangles below each eye (point down)
      {
        const triDown = new THREE.Shape();
        triDown.moveTo(-0.025, 0);
        triDown.quadraticCurveTo(0, -0.01, 0.025, 0);
        triDown.quadraticCurveTo(0.018, -0.07, 0, -0.1);
        triDown.quadraticCurveTo(-0.018, -0.07, -0.025, 0);
        const triGeo = new THREE.ShapeGeometry(triDown, 12);
        triGeo.rotateY(-Math.PI / 2);
        for (const s of [-1, 1]) {
          const tri = new THREE.Mesh(triGeo, purpleMarkMat);
          tri.position.set(fx, eyeY - eyeHalfH - 0.003, s * eyeSpacing);
          nfGroup.add(tri);
        }
      }

      // Mouth: wide rounded rectangle
      {
        const mGeo = new THREE.ShapeGeometry(
          makeRoundRect(0.055, 0.014, 0.014),
          12,
        );
        mGeo.rotateY(-Math.PI / 2);
        const mouth = new THREE.Mesh(mGeo, markingMat);
        mouth.position.set(fx, maskY - 0.22, 0);
        nfGroup.add(mouth);
      }

      nfGroup.position.set(nfX, 0, nfZ);
      this.group.add(nfGroup);
      this.nfGroup = nfGroup;
      this.nfBaseY = 0;
    }

    // ====================================================================
    // 7. CEILING GRAB BAR + HANGING RINGS
    // ====================================================================
    const vaultPeakY = vaultCenterY + vaultR; // top of arch
    const barY = vaultPeakY - 0.35; // hang below vault apex
    const barLen = carDepth - 0.6;
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, barLen, 8),
      brassMat,
    );
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0, barY, carCenter);
    this.group.add(bar);

    // Hanging rings along the bar
    const ringCount = 8;
    const ringSpacing = barLen / (ringCount + 1);
    for (let i = 0; i < ringCount; i++) {
      const rz = carStart + 0.3 + ringSpacing * (i + 1);

      // Small vertical connector strap
      const strap = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.08, 0.01),
        brassMat,
      );
      strap.position.set(0, barY - 0.04, rz);
      this.group.add(strap);

      // Ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.04, 0.006, 8, 16),
        brassMat,
      );
      ring.position.set(0, barY - 0.12, rz);
      this.group.add(ring);
    }

    // ====================================================================
    // 8. VERTICAL BRASS POLES
    // ====================================================================
    const polePositions = [
      { x: -0.3, z: carStart + 1.0 },
      { x: 0.3, z: carStart + 1.0 },
      { x: -0.3, z: carCenter },
      { x: 0.3, z: carCenter },
      { x: -0.3, z: carEnd - 1.0 },
      { x: 0.3, z: carEnd - 1.0 },
    ];
    const poleHeight = CABIN_HEIGHT - 0.1;
    for (const pos of polePositions) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, poleHeight, 8),
        brassMat,
      );
      pole.position.set(pos.x, floorY + poleHeight / 2, pos.z);
      this.group.add(pole);
    }

    // ====================================================================
    // 9. WARM YELLOW POINT LIGHTS (Spirited Away warm glow)
    // ====================================================================
    const lightColor = 0xffee99; // lighter warm yellow
    const lightIntensity = 0.8;
    const lightDist = 6;
    const lightPositions = [
      carStart + carDepth * 0.3,
      carStart + carDepth * 0.7,
    ];
    const lightY = vaultPeakY - 0.45; // hang from vault apex
    const fixtureBaseMat = new THREE.MeshStandardMaterial({
      color: 0x8a6a30,
      roughness: 0.4,
      metalness: 0.5,
    });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffeeaa });
    for (const lz of lightPositions) {
      const light = new THREE.PointLight(lightColor, lightIntensity, lightDist);
      light.castShadow = false;
      light.position.set(0, lightY, lz);
      this.group.add(light);
      // Brass base plate on ceiling
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.02, 8),
        fixtureBaseMat,
      );
      base.position.set(0, lightY + 0.15, lz);
      this.group.add(base);
      // Short stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6),
        fixtureBaseMat,
      );
      stem.position.set(0, lightY + 0.08, lz);
      this.group.add(stem);
      // Glowing bulb
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 8, 8),
        bulbMat,
      );
      bulb.position.set(0, lightY, lz);
      this.group.add(bulb);
    }

    // ====================================================================
    // 10. UNDERCARRIAGE — bogies + wheels
    // ====================================================================
    const underY = CABIN_FLOOR_Y - 0.15;
    // Under-frame rails
    for (const xOff of [-0.4, 0.4]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, carDepth + 0.5),
        darkMetalMat,
      );
      rail.position.set(xOff, underY, carCenter);
      this.group.add(rail);
    }

    const wheelRadius = 0.2;
    const wheelWidth = 0.08;
    const wheelGeo = new THREE.CylinderGeometry(
      wheelRadius,
      wheelRadius,
      wheelWidth,
      12,
    );
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelY = CABIN_FLOOR_Y - 0.35;

    for (const bogieOff of [carStart + 1.2, carEnd - 1.2]) {
      // Bogie frame
      const bogie = new THREE.Mesh(
        new THREE.BoxGeometry(TRACK_GAUGE + 0.2, 0.06, 1.0),
        darkMetalMat,
      );
      bogie.position.set(0, underY - 0.1, bogieOff);
      this.group.add(bogie);

      // Wheels
      for (const side of [-1, 1]) {
        const wheel = new THREE.Mesh(wheelGeo, frameMat);
        wheel.position.set(side * (TRACK_GAUGE / 2), wheelY, bogieOff);
        this.group.add(wheel);
      }

      // Axle
      const axle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, TRACK_GAUGE + 0.3, 6),
        darkMetalMat,
      );
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, wheelY, bogieOff);
      this.group.add(axle);
    }
  }
}
