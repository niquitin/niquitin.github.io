/*
 * Vua Bàn Nhậu — canonical dice visual model
 *
 * This is the single source of truth for the live game renderer. The Home
 * card uses approved static artwork while dice.js continues to own rules.
 */
(function (global) {
    'use strict';

    const THREE = global.THREE;
    if (!THREE) {
        global.DiceVisualModel = null;
        return;
    }

    const SPEC = Object.freeze({
        size: 1.72,
        half: 0.86,
        cornerRadius: 0.43,
        faceBulge: 0.020,
        segments: 24,
        pipRadius: 0.17,
        pipOpeningRadius: 0.142,
        pipGrid: 0.35
    });

    const PALETTES = Object.freeze([
        Object.freeze({ body: 0xffe8b6, pip: 0x171124, name: 'ivory' }),
        // The approved art pairs warm ivory with a clearly pink-lilac second
        // die. Keep the third die ivory so both gameplay modes share one look.
        Object.freeze({ body: 0xf895d8, pip: 0x9d004d, name: 'pink-lilac' }),
        Object.freeze({ body: 0xffe8b6, pip: 0x171124, name: 'ivory' })
    ]);

    const FACE_NORMALS = {
        1: new THREE.Vector3(0, 0, 1),
        2: new THREE.Vector3(0, 1, 0),
        3: new THREE.Vector3(1, 0, 0),
        4: new THREE.Vector3(-1, 0, 0),
        5: new THREE.Vector3(0, -1, 0),
        6: new THREE.Vector3(0, 0, -1)
    };

    const FACE_CONFIG = {
        1: { normal: 'z', sign: 1, u: 'x', v: 'y' },
        6: { normal: 'z', sign: -1, u: 'x', v: 'y' },
        2: { normal: 'y', sign: 1, u: 'x', v: 'z' },
        5: { normal: 'y', sign: -1, u: 'x', v: 'z' },
        3: { normal: 'x', sign: 1, u: 'z', v: 'y' },
        4: { normal: 'x', sign: -1, u: 'z', v: 'y' }
    };

    const PIP_PATTERNS = {
        1: [[0, 0]],
        2: [[-1, 1], [1, -1]],
        3: [[-1, 1], [0, 0], [1, -1]],
        4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
        5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
        6: [[-1, 1], [-1, 0], [-1, -1], [1, 1], [1, 0], [1, -1]]
    };

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function faceBulgeAt(u, v) {
        const inner = SPEC.half - SPEC.cornerRadius;
        const radial = clamp(Math.max(Math.abs(u), Math.abs(v)) / inner, 0, 1);
        return SPEC.faceBulge * (1 - Math.pow(radial, 4));
    }

    function createBodyGeometry() {
        const geometry = new THREE.BoxGeometry(
            SPEC.size,
            SPEC.size,
            SPEC.size,
            SPEC.segments,
            SPEC.segments,
            SPEC.segments
        );
        const positions = geometry.attributes.position;
        const normals = geometry.attributes.normal;
        const point = new THREE.Vector3();
        const clamped = new THREE.Vector3();
        const roundedNormal = new THREE.Vector3();
        const original = new THREE.Vector3();
        const inner = SPEC.half - SPEC.cornerRadius;

        for (let index = 0; index < positions.count; index += 1) {
            original.fromBufferAttribute(positions, index);
            clamped.set(
                clamp(original.x, -inner, inner),
                clamp(original.y, -inner, inner),
                clamp(original.z, -inner, inner)
            );
            roundedNormal.subVectors(original, clamped);
            if (roundedNormal.lengthSq() < 0.0000001) {
                roundedNormal.copy(original).normalize();
            } else {
                roundedNormal.normalize();
            }

            point.copy(clamped).addScaledVector(roundedNormal, SPEC.cornerRadius);

            // A very small face-center bulge removes the rigid cardboard-box
            // read while keeping enough planar area for legible pips.
            const absNormal = new THREE.Vector3(
                Math.abs(roundedNormal.x),
                Math.abs(roundedNormal.y),
                Math.abs(roundedNormal.z)
            );
            const dominantAxis = absNormal.x >= absNormal.y && absNormal.x >= absNormal.z
                ? 'x'
                : (absNormal.y >= absNormal.z ? 'y' : 'z');
            const axes = dominantAxis === 'x'
                ? [original.y, original.z]
                : (dominantAxis === 'y' ? [original.x, original.z] : [original.x, original.y]);
            point.addScaledVector(roundedNormal, faceBulgeAt(axes[0], axes[1]));

            positions.setXYZ(index, point.x, point.y, point.z);
            // Analytic rounded-box normals keep duplicated BoxGeometry seams
            // visually smooth without requiring BufferGeometryUtils.
            normals.setXYZ(index, roundedNormal.x, roundedNormal.y, roundedNormal.z);
        }

        positions.needsUpdate = true;
        normals.needsUpdate = true;
        // Each BoxGeometry face owns separate UV vertices. Pack its existing
        // UV square into one cell of a 3×2 alpha atlas, preserving a single
        // body material and draw call after the real cavity openings are cut.
        const uv = geometry.attributes.uv;
        geometry.groups.forEach((group, faceIndex) => {
            const visited = new Set();
            const column = faceIndex % 3;
            const row = Math.floor(faceIndex / 3);
            for (let offset = 0; offset < group.count; offset += 1) {
                const vertex = geometry.index.getX(group.start + offset);
                if (visited.has(vertex)) continue;
                visited.add(vertex);
                uv.setXY(vertex, (column + uv.getX(vertex)) / 3,
                    (1 - row + uv.getY(vertex)) / 2);
            }
        });
        uv.needsUpdate = true;
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.userData.diceVisualSpec = SPEC;
        return geometry;
    }

    function createPipGeometry(index) {
        // The dormant card-preview resource path still uses the flat R2 disc;
        // gameplay explicitly passes a palette index for the recessed bowl.
        if (index === undefined) return new THREE.CircleGeometry(SPEC.pipRadius, 32);
        const pink = paletteForIndex(index).name === 'pink-lilac';
        const rings = pink
            ? [
                [0.170, 0.026, 0xf895d8], [0.146, 0.016, 0xe986bc],
                [0.134, -0.020, 0x681339], [0.111, -0.075, 0x4b0626],
                [0.075, -0.130, 0x8d1850], [0.035, -0.156, 0xc73777]
            ]
            : [
                [0.170, 0.026, 0xffe8b6], [0.146, 0.016, 0xf6d89a],
                [0.134, -0.020, 0x6e3a10], [0.111, -0.075, 0x5a2608],
                [0.075, -0.130, 0x9a5015], [0.035, -0.156, 0xc8872c]
            ];
        const segments = 32;
        const positions = [];
        const colors = [];
        const indices = [];
        rings.forEach(([radius, depth, color], ringIndex) => {
            const shade = new THREE.Color(color);
            for (let step = 0; step < segments; step += 1) {
                const angle = step * Math.PI * 2 / segments;
                positions.push(radius * Math.cos(angle), radius * Math.sin(angle), depth);
                const bounce = ringIndex >= 2 ? 1 - 0.2 * Math.sin(angle) : 1;
                colors.push(shade.r * bounce, shade.g * bounce, shade.b * bounce);
            }
        });
        for (let ring = 0; ring < rings.length - 1; ring += 1) {
            for (let step = 0; step < segments; step += 1) {
                const next = (step + 1) % segments;
                const outer = ring * segments + step;
                const inner = (ring + 1) * segments + step;
                indices.push(outer, ring * segments + next, inner);
                indices.push(ring * segments + next, (ring + 1) * segments + next, inner);
            }
        }
        const center = positions.length / 3;
        positions.push(0, 0, -0.158);
        const centerShade = new THREE.Color(pink ? 0xdc5e94 : 0xd99d42);
        colors.push(centerShade.r, centerShade.g, centerShade.b);
        for (let step = 0; step < segments; step += 1) {
            indices.push(
                (rings.length - 1) * segments + step,
                (rings.length - 1) * segments + (step + 1) % segments,
                center
            );
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        geometry.userData.recessDepth = 0.158;
        return geometry;
    }

    function createBodyHoleMask() {
        // BoxGeometry groups are +X, -X, +Y, -Y, +Z, -Z. Alpha-test cuts
        // the same 21 circles out of its existing six UV-mapped surfaces;
        // no shader discard loop or extra runtime pass is required.
        const faces = [3, 4, 2, 5, 1, 6];
        const tile = 192;
        const canvas = document.createElement('canvas');
        canvas.width = tile * 3;
        canvas.height = tile * 2;
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#000';
        faces.forEach((value, faceIndex) => {
            const column = faceIndex % 3;
            const row = Math.floor(faceIndex / 3);
            PIP_PATTERNS[value].forEach(([gridU, gridV]) => {
                const u = gridU * SPEC.pipGrid / SPEC.size;
                const v = gridV * SPEC.pipGrid / SPEC.size;
                const horizontalFlip = value === 3 || value === 6;
                const verticalFlip = value === 2;
                const x = column * tile + tile * (0.5 + (horizontalFlip ? -u : u));
                const y = row * tile + tile * (0.5 + (verticalFlip ? v : -v));
                context.beginPath();
                context.arc(x, y, tile * SPEC.pipOpeningRadius / SPEC.size, 0, Math.PI * 2);
                context.fill();
            });
        });
        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
    }

    function createPipTexture(index) {
        const palette = paletteForIndex(index);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const context = canvas.getContext('2d');
        const pink = palette.name === 'pink-lilac';
        const lip = pink ? '#ffe3f2' : '#fff7dc';

        // Paint a shallow concave bowl on a single face-aligned disc. The
        // upper inner wall is dark; the lower wall catches warm reflected
        // light. This is a bounded shading illusion, not a raised pip mesh.
        const bevel = context.createRadialGradient(64, 64, 43, 64, 64, 62);
        bevel.addColorStop(0, pink ? '#7e174b' : '#9b6428');
        bevel.addColorStop(0.25, pink ? '#ad4775' : '#dba75e');
        bevel.addColorStop(0.47, lip);
        bevel.addColorStop(0.68, pink ? '#ea8bc0' : '#ffe3a3');
        bevel.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = bevel;
        context.beginPath();
        context.arc(64, 64, 62, 0, Math.PI * 2);
        context.fill();

        context.save();
        context.beginPath();
        context.arc(64, 64, 45, 0, Math.PI * 2);
        context.clip();
        const bowl = context.createLinearGradient(43, 22, 87, 110);
        bowl.addColorStop(0, pink ? '#250016' : '#291404');
        bowl.addColorStop(0.35, pink ? '#610a36' : '#65330d');
        bowl.addColorStop(0.74, pink ? '#a91e5b' : '#af6b19');
        bowl.addColorStop(1, pink ? '#ee73a6' : '#ffd06c');
        context.fillStyle = bowl;
        context.fillRect(0, 0, 128, 128);

        const innerShadow = context.createRadialGradient(51, 39, 5, 64, 64, 51);
        innerShadow.addColorStop(0, 'rgba(8,2,8,.45)');
        innerShadow.addColorStop(0.55, 'rgba(8,2,8,.18)');
        innerShadow.addColorStop(1, 'rgba(8,2,8,0)');
        context.fillStyle = innerShadow;
        context.fillRect(0, 0, 128, 128);

        const bounce = context.createRadialGradient(82, 91, 2, 82, 91, 38);
        bounce.addColorStop(0, pink ? 'rgba(255,192,220,.85)' : 'rgba(255,226,129,.9)');
        bounce.addColorStop(0.48, pink ? 'rgba(255,126,184,.3)' : 'rgba(255,179,62,.32)');
        bounce.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = bounce;
        context.fillRect(0, 0, 128, 128);
        context.restore();

        // Thin glossy lip and asymmetric inner-wall highlights make the
        // well legible even after downsampling in the mobile WebGL canvas.
        context.lineWidth = 4;
        context.strokeStyle = 'rgba(12,4,12,.65)';
        context.beginPath();
        context.arc(64, 64, 45, Math.PI * 1.10, Math.PI * 1.91);
        context.stroke();
        context.lineWidth = 3;
        context.strokeStyle = pink ? 'rgba(255,175,212,.88)' : 'rgba(255,227,155,.9)';
        context.beginPath();
        context.arc(64, 64, 45, 0.12, Math.PI * 0.86);
        context.stroke();
        context.lineWidth = 3;
        context.strokeStyle = 'rgba(255,255,255,.78)';
        context.beginPath();
        context.arc(64, 64, 53, 0.22, 1.64);
        context.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        return texture;
    }

    function paletteForIndex(index) {
        return PALETTES[Math.max(0, Number(index) || 0) % PALETTES.length];
    }

    function createMaterials(index, resources) {
        const palette = paletteForIndex(index);
        const baseBody = new THREE.MeshPhysicalMaterial({
            color: palette.body,
            emissive: index % PALETTES.length === 1 ? 0x320015 : 0x281500,
            emissiveIntensity: index % PALETTES.length === 1 ? 0.045 : 0.035,
            roughness: resources.holeMask ? 0.09 : 0.14,
            metalness: 0.01,
            clearcoat: 1,
            clearcoatRoughness: resources.holeMask ? 0.04 : 0.075,
            envMap: resources.envMap || null,
            envMapIntensity: resources.holeMask ? 1.18 : 0.72,
            alphaMap: resources.holeMask || null,
            alphaTest: resources.holeMask ? 0.5 : 0
        });
        return {
            palette,
            body: baseBody,
            pip: resources.holeMask ? new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.25,
                metalness: 0.12,
                side: THREE.DoubleSide
            }) : new THREE.MeshBasicMaterial({
                map: resources.pipTextures && resources.pipTextures[index % PALETTES.length === 1 ? 1 : 0],
                color: resources.pipTextures ? 0xffffff : palette.pip,
                transparent: !!resources.pipTextures,
                depthWrite: !resources.pipTextures,
                toneMapped: false
            })
        };
    }

    function createPips(value, material, pipGeometry, recessed) {
        const config = FACE_CONFIG[value];
        const result = [];
        PIP_PATTERNS[value].forEach(([u, v]) => {
            const pip = new THREE.Mesh(pipGeometry, material);
            const offsetU = u * SPEC.pipGrid;
            const offsetV = v * SPEC.pipGrid;
            const surface = SPEC.half + faceBulgeAt(offsetU, offsetV);
            const position = { x: 0, y: 0, z: 0 };
            position[config.normal] = config.sign * (surface + (recessed ? 0 : 0.014));
            position[config.u] = offsetU;
            position[config.v] = offsetV;
            pip.position.set(position.x, position.y, position.z);
            pip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), FACE_NORMALS[value]);
            pip.castShadow = false;
            pip.receiveShadow = false;
            pip.name = `pip-${value}`;
            result.push(pip);
        });
        return result;
    }

    function createResources() {
        return {
            bodyGeometry: createBodyGeometry(),
            pipGeometry: createPipGeometry()
        };
    }

    function createDieVisual(index, resources) {
        resources = resources || createResources();
        const materials = createMaterials(index, resources);
        const visual = new THREE.Group();
        const body = new THREE.Mesh(resources.bodyGeometry, materials.body);
        body.castShadow = true;
        body.receiveShadow = true;
        body.name = `die-body-${index + 1}`;
        visual.add(body);

        Object.keys(PIP_PATTERNS).forEach((valueKey) => {
            createPips(Number(valueKey), materials.pip, resources.pipGeometry, !!resources.holeMask)
                .forEach((pip) => visual.add(pip));
        });

        visual.userData.paletteName = materials.palette.name;
        return {
            visual,
            body,
            materials: [materials.body, materials.pip],
            palette: materials.palette
        };
    }

    function resultQuaternion(value, twist, resultUp) {
        const normal = FACE_NORMALS[value] || FACE_NORMALS[1];
        const up = resultUp || new THREE.Vector3(0, 1, 0);
        const target = new THREE.Quaternion().setFromUnitVectors(normal, up);
        const rollTwist = new THREE.Quaternion().setFromAxisAngle(up, twist || 0);
        target.premultiply(rollTwist);
        return target;
    }

    function previewTwist(index, count) {
        if (count === 3) return [-0.22, 0.04, 0.20][index] || 0;
        return index === 0 ? -0.22 : 0.22;
    }

    function previewQuaternion(value, index, count, resultUp) {
        const target = resultQuaternion(value, previewTwist(index, count), resultUp);
        const tilts = count === 3
            ? [[-0.13, 0.10], [0.08, -0.04], [-0.11, -0.10]]
            : [[-0.16, 0.11], [-0.12, -0.11]];
        const pair = tilts[index] || [0, 0];
        const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(pair[0], 0, pair[1], 'XYZ'));
        return tilt.multiply(target);
    }

    function previewValues(count) {
        return count === 3 ? [5, 2, 3] : [5, 3];
    }

    global.DiceVisualModel = Object.freeze({
        SPEC,
        PALETTES,
        FACE_NORMALS,
        PIP_PATTERNS,
        createBodyGeometry,
        createPipGeometry,
        createBodyHoleMask,
        createPipTexture,
        createResources,
        createDieVisual,
        resultQuaternion,
        previewQuaternion,
        previewValues,
        previewTwist
    });
})(window);
