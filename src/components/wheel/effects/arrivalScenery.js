import {
    BoxGeometry, CanvasTexture, CylinderGeometry, Group, InstancedMesh,
    Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry,
    RepeatWrapping, SRGBColorSpace, TorusGeometry, CircleGeometry, SphereGeometry,
} from 'three';

const noise = i => { const n = Math.sin(i * 127.1 + 43.7) * 43758.5453; return n - Math.floor(n); };

// Local textures keep set dressing off the network-critical arrival path.
function surfaceTexture(stone) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = stone ? '#c4c8cd' : '#b0b0b0';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4500; i++) {
        const value = Math.floor(80 + noise(i * 3) * 130);
        ctx.fillStyle = 'rgba(' + value + ',' + value + ',' + value + ',' + (stone ? 0.32 : 0.12) + ')';
        ctx.fillRect(noise(i + 9) * 256, noise(i + 81) * 256, stone ? 2 : 12, 1);
    }
    if (stone) {
        for (let i = 0; i < 35; i++) {
            const x = noise(i + 230) * 256, y = noise(i + 530) * 256;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, 15 + noise(i) * 42);
            grad.addColorStop(0, 'rgba(22,30,39,0.35)');
            grad.addColorStop(1, 'rgba(22,30,39,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 256, 256);
        }
    }
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    return texture;
}

/** Set dressing only: no timers, audio, camera changes or cue dependencies. */
export function buildArrivalScenery(scene, materials, track) {
    const stone = track(surfaceTexture(true));
    stone.repeat.set(64, 4);
    materials.platform.roughnessMap = stone;
    materials.platform.bumpMap = stone;
    materials.platform.bumpScale = 0.045;
    materials.platform.roughness = 0.95;
    const metal = track(surfaceTexture(false));
    metal.repeat.set(3, 2);
    for (const material of [materials.hull, materials.hullDark]) {
        material.roughnessMap = metal;
        material.bumpMap = metal;
        material.bumpScale = 0.012;
    }

    const set = new Group();
    scene.add(set);
    const iron = track(new MeshStandardMaterial({ color: 0x304854, roughness: 0.46, metalness: 0.7 }));
    const masonry = track(new MeshStandardMaterial({ color: 0x283944, roughness: 0.9 }));
    const glazing = document.createElement('canvas');
    glazing.width = glazing.height = 128;
    const paint = glazing.getContext('2d');
    const light = paint.createRadialGradient(64, 92, 4, 64, 64, 86);
    light.addColorStop(0, '#fff4d8');
    light.addColorStop(0.45, '#c9d3d5');
    light.addColorStop(1, '#354555');
    paint.fillStyle = light;
    paint.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1000; i++) {
        paint.fillStyle = 'rgba(14,25,32,0.06)';
        paint.fillRect(noise(i) * 128, noise(i + 83) * 128, 1, 5 + noise(i + 91) * 15);
    }
    const glazingMap = track(new CanvasTexture(glazing));
    glazingMap.colorSpace = SRGBColorSpace;
    const glass = track(new MeshBasicMaterial({ color: 0x826346, map: glazingMap }));
    const box = track(new BoxGeometry(1, 1, 1));
    const parts = [];
    const detail = (x, y, z, sx, sy, sz, rz = 0) => parts.push({ x, y, z, sx, sy, sz, rz });
    const mesh = (geometry, material, x, y, z) => {
        const object = new Mesh(geometry, material);
        object.position.set(x, y, z);
        set.add(object);
        return object;
    };

    // An illuminated arched clerestory gives the station height and depth.
    const arch = track(new TorusGeometry(1.38, 0.065, 6, 24, Math.PI));
    // 1.775 tall, not 1.85: the springing line is y=4.1 and that is where the
    // arch's own pane starts, so a taller rectangle laps 0.075 over it in the
    // same z plane. Both take the glazing map on their own UVs, so the overlap
    // samples the gradient twice at different heights and z-fights. The sill
    // stays at 2.325 and the centre drops to meet the arch exactly.
    const pane = track(new PlaneGeometry(2.54, 1.775));
    const archPane = track(new CircleGeometry(1.30, 24, 0, Math.PI));
    const wall = mesh(box, masonry, 0, 3.7, -7.9);
    wall.scale.set(90, 1.8, 0.35);
    for (let i = -7; i <= 7; i++) {
        const x = i * 3.1;
        const windowMaterial = track(glass.clone());
        windowMaterial.color.setHex(i % 3 === 0 ? 0x9f7848 : 0x2d4656);
        mesh(arch, iron, x, 4.1, -7.62);
        mesh(pane, windowMaterial, x, 3.2125, -7.68);
        mesh(archPane, windowMaterial, x, 4.1, -7.68);
        for (const dx of [-1.42, 0, 1.42]) detail(x + dx, 3.35, -7.55, 0.055, 1.6, 0.09);
        for (const y of [2.85, 3.5, 4.1]) detail(x, y, -7.53, 2.85, 0.045, 0.1);
        detail(x, 5.52, -7.8, 3.1, 0.16, 0.5);
        for (const a of [Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4]) {
            detail(x + Math.cos(a) * 0.68, 4.1 + Math.sin(a) * 0.68, -7.56, 1.36, 0.035, 0.055, a);
        }
    }

    // Trusses sit behind the original roof; the foreground remains unobstructed.
    for (let i = -5; i <= 5; i++) {
        const x = i * 6.2;
        detail(x, 4.1, -6.2, 0.12, 2.5, 0.12);
        detail(x, 3.05, -4.7, 0.12, 0.12, 4.4);
        for (const dir of [-1, 1]) {
            detail(x + dir * 1.5, 4.6, -6.2, 3.45, 0.10, 0.12, -dir * 0.52);
            detail(x + dir * 1.5, 3.8, -6.2, 3.1, 0.065, 0.09);
            detail(x + dir * 0.8, 4.05, -6.2, 1, 0.05, 0.07, dir * 0.65);
        }
        detail(x, 2.88, -6.2, 0.5, 0.15, 0.5);
    }
    for (const y of [3.8, 5.48]) detail(0, y, -6.2, 75, 0.09, 0.09);
    const structure = track(new InstancedMesh(box, iron, parts.length));
    const transform = new Object3D();
    parts.forEach((p, i) => {
        transform.position.set(p.x, p.y, p.z);
        transform.scale.set(p.sx, p.sy, p.sz);
        transform.rotation.set(0, 0, p.rz);
        transform.updateMatrix();
        structure.setMatrixAt(i, transform.matrix);
    });
    structure.instanceMatrix.needsUpdate = true;
    set.add(structure);

    const dial = document.createElement('canvas');
    dial.width = dial.height = 256;
    const ctx = dial.getContext('2d');
    ctx.fillStyle = '#e5d5ab';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#26353d';
    for (let i = 0; i < 60; i++) {
        const a = i * Math.PI / 30, inner = i % 5 === 0 ? 90 : 103;
        ctx.lineWidth = i % 5 === 0 ? 5 : 2;
        ctx.beginPath();
        ctx.moveTo(128 + Math.sin(a) * inner, 128 - Math.cos(a) * inner);
        ctx.lineTo(128 + Math.sin(a) * 111, 128 - Math.cos(a) * 111);
        ctx.stroke();
    }
    ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(85, 97); ctx.lineTo(128, 128); ctx.lineTo(170, 63); ctx.stroke();
    const dialTex = track(new CanvasTexture(dial));
    dialTex.colorSpace = SRGBColorSpace;
    const clockFace = track(new MeshBasicMaterial({ map: dialTex, color: 0xc8b78e }));
    const clock = mesh(track(new CylinderGeometry(0.58, 0.58, 0.15, 48)), iron, 6.2, 4.32, -5.95);
    clock.rotation.x = Math.PI / 2;
    mesh(track(new CircleGeometry(0.51, 48)), clockFace, 6.2, 4.32, -5.86);
    return set;
}

/** Riveted seams and enamel cab plates follow the existing locomotive group. */
export function detailArrivalLocomotive(loco, materials, track) {
    const locations = [];
    for (const x of [0.05, 0.62, 1.2]) {
        for (let i = 0; i < 20; i++) {
            const a = i * Math.PI / 10;
            locations.push([x, 1 + Math.sin(a) * 0.551, Math.cos(a) * 0.551]);
        }
    }
    for (const z of [-0.66, 0.66]) {
        for (let i = 0; i < 9; i++) {
            locations.push([-1.55 + i * 0.125, 0.7, z]);
            locations.push([-1.55 + i * 0.125, 1.73, z]);
        }
    }
    const rivets = track(new InstancedMesh(track(new SphereGeometry(0.018, 6, 4)), materials.trim, locations.length));
    const transform = new Object3D();
    locations.forEach((xyz, i) => {
        transform.position.set(...xyz);
        transform.updateMatrix();
        rivets.setMatrixAt(i, transform.matrix);
    });
    rivets.instanceMatrix.needsUpdate = true;
    loco.add(rivets);

    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#171e24'; ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#ba995c'; ctx.lineWidth = 5; ctx.strokeRect(5, 5, 246, 86);
    ctx.fillStyle = '#e8c785'; ctx.font = 'bold 48px Georgia';
    ctx.textAlign = 'center'; ctx.fillText('FIB 01', 128, 65);
    const texture = track(new CanvasTexture(canvas));
    texture.colorSpace = SRGBColorSpace;
    const plate = track(new MeshStandardMaterial({ map: texture, roughness: 0.4, metalness: 0.25 }));
    const geo = track(new PlaneGeometry(0.62, 0.23));
    for (const side of [-1, 1]) {
        const sign = new Mesh(geo, plate);
        sign.position.set(-1.05, 0.94, side * 0.657);
        sign.rotation.y = side > 0 ? 0 : Math.PI;
        loco.add(sign);
    }
}
