/* Vua Bàn Nhậu — Home Grid dice preview from the canonical WebGL model. */
(function (global) {
    'use strict';

    const THREE = global.THREE;
    const model = global.DiceVisualModel;
    const canvas = document.getElementById('dice-card-canvas');
    const host = canvas ? canvas.closest('.dice-card-visual') : null;
    if (!THREE || !model || !canvas || !host || !THREE.WebGLRenderer) return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'low-power'
        });
    } catch (error) {
        return;
    }

    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('toneMapping' in renderer) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    if ('toneMappingExposure' in renderer) renderer.toneMappingExposure = 1.08;
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if ('outputEncoding' in renderer && THREE.sRGBEncoding) {
        renderer.outputEncoding = THREE.sRGBEncoding;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 30);
    camera.position.set(0, 3.42, 6.08);
    camera.lookAt(0, -0.08, 0);

    const hemi = new THREE.HemisphereLight(0x8deeff, 0x17042c, 1.02);
    const key = new THREE.DirectionalLight(0xffefc8, 2.42);
    key.position.set(-4.5, 7, 5.5);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 18;
    key.shadow.bias = -0.00025;
    scene.add(hemi, key);

    const fill = new THREE.PointLight(0xff2bc2, 1.04, 12, 2);
    fill.position.set(4, 2.4, -2.5);
    const rim = new THREE.PointLight(0x18eaff, 0.94, 10, 2);
    rim.position.set(-3, 2.2, -4.5);
    scene.add(fill, rim);

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 5),
        new THREE.ShadowMaterial({ color: 0x080014, opacity: 0.34, depthWrite: false })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.78;
    ground.receiveShadow = true;
    scene.add(ground);

    const resources = model.createResources();
    const values = model.previewValues(2);
    const dice = values.map((value, index) => {
        const die = model.createDieVisual(index, resources).visual;
        die.scale.setScalar(0.86);
        die.position.set(index === 0 ? -0.86 : 0.86, -0.04, index === 0 ? 0.08 : -0.08);
        die.quaternion.copy(model.previewQuaternion(value, index, 2, new THREE.Vector3(0, 1, 0)));
        scene.add(die);
        return die;
    });

    function render() {
        const rect = host.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        renderer.render(scene, camera);
        host.classList.add('is-ready');
    }

    canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        host.classList.remove('is-ready');
    }, false);
    canvas.addEventListener('webglcontextrestored', render, false);

    if (global.ResizeObserver) {
        const observer = new ResizeObserver(render);
        observer.observe(host);
    } else {
        global.addEventListener('resize', render, { passive: true });
    }

    // Wait one paint so the grid has its final responsive dimensions.
    global.requestAnimationFrame(render);
    global.diceCardPreview = { render, dice };
})(window);
