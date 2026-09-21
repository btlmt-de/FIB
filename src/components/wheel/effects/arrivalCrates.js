import {
    BoxGeometry, CanvasTexture, Group, InstancedMesh, Mesh, MeshStandardMaterial,
    Object3D, PlaneGeometry, SphereGeometry, SRGBColorSpace, Color,
} from 'three';

const noise = i => { const n = Math.sin(i * 127.1 + 71.7) * 43758.5453; return n - Math.floor(n); };

function timberTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#a78b60'; ctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 420; i++) {
        const x = noise(i) * 128;
        ctx.strokeStyle = i % 3 ? 'rgba(52,31,15,0.16)' : 'rgba(245,215,155,0.20)';
        ctx.lineWidth = 0.4 + noise(i + 17) * 1.1;
        ctx.beginPath(); ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 8 * noise(i + 19), 80, x - 10 * noise(i + 43), 160, x + 3, 256);
        ctx.stroke();
    }
    // Small knots and irregular saw marks; no external texture assets.
    for (let k = 0; k < 3; k++) {
        const x = 22 + noise(k + 18) * 84, y = 40 + noise(k + 39) * 180;
        for (let r = 1; r < 5; r++) {
            ctx.strokeStyle = 'rgba(45,27,12,0.15)';
            ctx.beginPath(); ctx.ellipse(x, y, r * 1.5, r * 4, 0.12, 0, Math.PI * 2); ctx.stroke();
        }
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
}

function freightLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c4ad7c'; ctx.fillRect(0, 0, 256, 160);
    for (let i = 0; i < 1100; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(66,43,22,0.12)' : 'rgba(255,238,193,0.22)';
        ctx.fillRect(noise(i) * 256, noise(i + 77) * 160, 1 + noise(i + 91) * 5, 1);
    }
    ctx.fillStyle = '#352c21'; ctx.textAlign = 'center';
    ctx.font = 'bold 48px Georgia'; ctx.fillText('FIB', 128, 54);
    ctx.font = 'bold 17px sans-serif'; ctx.fillText('PRIORITY FREIGHT', 128, 83);
    ctx.fillRect(20, 94, 216, 2);
    ctx.font = '13px sans-serif'; ctx.fillText('HANDLE WITH CARE', 128, 120);
    for (let i = 0; i < 40; i++) ctx.fillRect(42 + i * 4.3, 133, 1 + (i % 3), 15);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
}

/** Shared assets; returned objects retain the scene's original animation handles. */
export function createArrivalCrateFactory(materials, track, addGlow) {
    const woodMap = track(timberTexture());
    const wood = track(new MeshStandardMaterial({ map: woodMap, color: 0xab916a, roughness: 0.9, bumpMap: woodMap, bumpScale: 0.006 }));
    const frameWood = track(new MeshStandardMaterial({ map: woodMap, color: 0xd0b17d, roughness: 0.85, bumpMap: woodMap, bumpScale: 0.004 }));
    const innerWood = track(new MeshStandardMaterial({ map: woodMap, color: 0x796448, roughness: 0.97 }));
    const hardware = track(new MeshStandardMaterial({ color: 0x3e4548, roughness: 0.48, metalness: 0.7 }));
    const label = track(new MeshStandardMaterial({ map: track(freightLabel()), color: 0xd4c8a9, roughness: 1 }));
    const cube = track(new BoxGeometry(1, 1, 1));
    const nail = track(new SphereGeometry(0.009, 6, 4));
    const labelGeo = track(new PlaneGeometry(0.32, 0.20));
    const dummy = new Object3D();
    const tint = new Color();
    const batch = (parent, geometry, material, pieces, seed = 0, varied = false) => {
        const instanced = track(new InstancedMesh(geometry, material, pieces.length));
        pieces.forEach(([x, y, z, sx = 1, sy = 1, sz = 1, rz = 0], i) => {
            dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, 0, rz);
            dummy.updateMatrix(); instanced.setMatrixAt(i, dummy.matrix);
            if (varied) instanced.setColorAt(i, tint.setScalar(0.76 + noise(seed * 31 + i) * 0.24));
        });
        instanced.instanceMatrix.needsUpdate = true;
        if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
        instanced.castShadow = true; instanced.receiveShadow = true;
        parent.add(instanced);
        return instanced;
    };

    return index => {
        const crate = new Group();
        const boards = [], frame = [], fittings = [], nails = [];
        // Four thin walls, with a real cavity and dark floor beneath the light.
        for (let p = 0; p < 5; p++) {
            const along = (p - 2) * 0.12;
            for (const side of [-1, 1]) {
                boards.push([along, -0.012, side * 0.288, 0.116, 0.574, 0.044]);
                boards.push([side * 0.288, -0.012, along, 0.044, 0.574, 0.116]);
            }
        }
        batch(crate, cube, wood, boards, index, true);
        batch(crate, cube, innerWood, [[0, -0.283, 0, 0.58, 0.054, 0.58]]);
        for (const x of [-0.292, 0.292]) for (const z of [-0.292, 0.292]) {
            frame.push([x, 0, z, 0.075, 0.62, 0.075]);
        }
        for (const side of [-1, 1]) {
            for (const y of [-0.23, 0.225]) {
                frame.push([0, y, side * 0.314, 0.62, 0.057, 0.035]);
                frame.push([side * 0.314, y, 0, 0.035, 0.057, 0.62]);
                for (const x of [-0.29, 0.29]) {
                    fittings.push([x, y, side * 0.337, 0.096, 0.072, 0.012]);
                    fittings.push([side * 0.337, y, x, 0.012, 0.072, 0.096]);
                    nails.push([x, y, side * 0.348]);
                    nails.push([side * 0.348, y, x]);
                }
            }
            frame.push([0, -0.345, side * 0.2, 0.66, 0.07, 0.13]);
            // Lower corner gussets leave the label and upper face unobstructed.
            frame.push([side * 0.16, -0.15, 0.331, 0.26, 0.042, 0.028, side * 0.62]);
            fittings.push([side * 0.2, 0.23, -0.341, 0.07, 0.15, 0.018]);
        }
        batch(crate, cube, frameWood, frame, index + 10, true);
        batch(crate, cube, hardware, fittings);
        batch(crate, nail, materials.trim, nails);
        const mark = new Mesh(labelGeo, label);
        mark.position.set(-0.018, 0.04, 0.314); mark.rotation.z = (noise(index + 73) - 0.5) * 0.06;
        crate.add(mark);

        // Keep the original hinge position and dimensions for the timed throw.
        const lidPivot = new Object3D();
        lidPivot.position.set(0, 0.31, -0.31);
        const lidBoards = [];
        for (let p = 0; p < 5; p++) lidBoards.push([(p - 2) * 0.132, 0.02, 0.31, 0.128, 0.06, 0.66]);
        batch(lidPivot, cube, innerWood, lidBoards, index + 30, true);
        batch(lidPivot, cube, frameWood, [[-0.21, 0.061, 0.31, 0.058, 0.022, 0.64], [0.21, 0.061, 0.31, 0.058, 0.022, 0.64]]);
        batch(lidPivot, cube, hardware, [[-0.2, 0.061, 0.045, 0.07, 0.018, 0.13], [0.2, 0.061, 0.045, 0.07, 0.018, 0.13]]);
        crate.add(lidPivot);
        // An inset lip leaks amber through the narrow gap below the closed lid.
        batch(crate, cube, materials.glow, [[0, 0.282, 0.295, 0.55, 0.009, 0.02], [0, 0.282, -0.295, 0.55, 0.009, 0.02], [-0.295, 0.282, 0, 0.02, 0.009, 0.55], [0.295, 0.282, 0, 0.02, 0.009, 0.55]]);
        const seamGlow = addGlow(crate, 0, 0.2, 0, 1.1, 0xffaa00, 0.2);
        const core = addGlow(crate, 0, 0.16, 0, 0.9, 0xffaa00, 0);
        return { crate, lidPivot, seamGlow, core };
    };
}
