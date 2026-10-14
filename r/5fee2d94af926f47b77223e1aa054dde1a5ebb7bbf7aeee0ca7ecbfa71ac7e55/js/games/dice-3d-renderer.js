/*
 * Vua Bàn Nhậu — Dice 3D renderer
 *
 * Three.js is vendored in js/vendor/three.min.js so the WebView build stays
 * fully offline.  The renderer owns pixels and motion; dice.js owns random
 * values and the 7–8–9 rules.
 */
(function (global) {
    'use strict';

    const THREE = global.THREE;
    const DiceVisualModel = global.DiceVisualModel;
    if (!THREE || !DiceVisualModel) {
        global.Dice3DRenderer = class Dice3DRendererUnavailable {
            init() { return false; }
            setDiceCount() {}
            showImmediate() {}
            roll() { return Promise.resolve({ fallback: true }); }
            cancelAnimation() { return false; }
            getDebugState() { return null; }
            destroy() {}
        };
        return;
    }

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const smooth = (value) => value * value * (3 - 2 * value);
    const smoother = (value) => value * value * value * (value * (value * 6 - 15) + 10);
    // A soft ease-out layered over smootherstep: the die starts settling
    // gently, reveals the result sooner, then loses angular speed into rest.
    const settleEase = (value) => {
        const t = clamp(value, 0, 1);
        const eased = smoother(t);
        return 1 - (1 - eased) * (1 - eased);
    };

    class Dice3DRenderer {
        constructor() {
            this.canvas = null;
            this.host = null;
            this.fallback = null;
            this.renderer = null;
            this.scene = null;
            this.camera = null;
            this.diceRoot = null;
            this.dice = [];
            this.diceCount = 2;
            this.currentValues = [1, 1];
            this.bodyGeometry = null;
            this.pipGeometries = null;
            this.holeMask = null;
            this.studioEnvironment = null;
            this.model = DiceVisualModel;
            this.shadowTexture = null;
            this.shadowMaterial = null;
            this.animation = null;
            this.raf = 0;
            this.ready = false;
            this.contextLost = false;
            this.resizeObserver = null;
            this.resizeHandler = null;
            // The result face is the face resting on the top plane (+Y). The
            // elevated camera then reads the dots like a real tabletop die.
            this.resultUp = new THREE.Vector3(0, 1, 0);
            this.reducedMotion = false;
            this.rollToken = 0;
            this.dieScale = 0.92;
            this.groundY = -0.79;
            this.bodyHalfHeight = DiceVisualModel.SPEC.half + DiceVisualModel.SPEC.faceBulge;
            this.pendingLayout = false;
        }

        init(options) {
            options = options || {};
            this.canvas = options.canvas || null;
            this.host = options.host || (this.canvas ? this.canvas.closest('.dice-arena-wrapper') : null);
            this.fallback = options.fallback || null;

            if (!this.canvas || !this.host || !THREE.WebGLRenderer) {
                this.useFallback();
                return false;
            }

            this.reducedMotion = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

            try {
                this.renderer = new THREE.WebGLRenderer({
                    canvas: this.canvas,
                    alpha: true,
                    antialias: true,
                    powerPreference: 'high-performance',
                    preserveDrawingBuffer: false
                });
            } catch (error) {
                this.useFallback();
                return false;
            }

            this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
            this.renderer.setClearColor(0x000000, 0);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            if ('toneMapping' in this.renderer) this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            if ('toneMappingExposure' in this.renderer) this.renderer.toneMappingExposure = 1.20;
            if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            } else if ('outputEncoding' in this.renderer && THREE.sRGBEncoding) {
                this.renderer.outputEncoding = THREE.sRGBEncoding;
            }

            this.scene = new THREE.Scene();
            this.studioEnvironment = this.createStudioEnvironment();
            this.camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
            this.camera.position.set(0, 5.7, 4.8);
            this.camera.lookAt(0, -0.10, 0);
            this.resultUp.set(0, 1, 0);

            this.diceRoot = new THREE.Group();
            this.scene.add(this.diceRoot);
            this.createLighting();
            this.createGround();
            this.setDiceCount(this.diceCount);

            this.canvas.addEventListener('webglcontextlost', (event) => {
                event.preventDefault();
                this.contextLost = true;
                this.stopLoop();
                this.useFallback();
            }, false);
            this.canvas.addEventListener('webglcontextrestored', () => {
                this.contextLost = false;
                this.ready = true;
                if (this.host) this.host.classList.add('dice-webgl-ready');
                if (this.canvas) {
                    this.canvas.hidden = false;
                    this.canvas.style.display = 'block';
                }
                if (this.fallback) this.fallback.hidden = true;
                this.resize();
                this.render();
            }, false);

            if (global.ResizeObserver) {
                this.resizeObserver = new ResizeObserver(() => this.resize());
                this.resizeObserver.observe(this.host);
            } else {
                this.resizeHandler = () => this.resize();
                global.addEventListener('resize', this.resizeHandler, { passive: true });
            }

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) this.stopLoop();
                else if (this.animation) this.startLoop();
                else this.render();
            });

            this.ready = true;
            this.canvas.hidden = false;
            this.canvas.style.display = 'block';
            if (this.fallback) this.fallback.hidden = true;
            this.host.classList.add('dice-webgl-ready');
            this.resize();
            this.showImmediate(this.currentValues);
            return true;
        }

        createStudioEnvironment() {
            // Small baked studio cards give the body broad, soft highlights.
            // No camera capture, dynamic reflection or postprocessing pass.
            const faces = Array.from({ length: 6 }, (_, index) => {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 128;
                const context = canvas.getContext('2d');
                context.fillStyle = index === 2 ? '#575569' : '#292735';
                context.fillRect(0, 0, 128, 128);
                if (index !== 3) {
                    const softbox = context.createRadialGradient(54, 44, 5, 54, 44, 76);
                    softbox.addColorStop(0, 'rgba(255,255,255,.95)');
                    softbox.addColorStop(0.36, 'rgba(255,255,255,.68)');
                    softbox.addColorStop(0.72, 'rgba(255,255,255,.13)');
                    softbox.addColorStop(1, 'rgba(255,255,255,0)');
                    context.fillStyle = softbox;
                    context.fillRect(0, 0, 128, 128);
                }
                // Small colored studio cards, reflected by the existing
                // clearcoat rather than extra lights or a postprocess pass.
                const cyan = context.createLinearGradient(0, 0, 48, 0);
                cyan.addColorStop(0, 'rgba(39,237,255,.62)');
                cyan.addColorStop(1, 'rgba(39,237,255,0)');
                context.fillStyle = cyan;
                context.fillRect(0, 0, 48, 128);
                const magenta = context.createLinearGradient(80, 0, 128, 0);
                magenta.addColorStop(0, 'rgba(255,69,198,0)');
                magenta.addColorStop(1, 'rgba(255,69,198,.58)');
                context.fillStyle = magenta;
                context.fillRect(80, 0, 48, 128);
                return canvas;
            });
            const environment = new THREE.CubeTexture(faces);
            if (THREE.SRGBColorSpace) environment.colorSpace = THREE.SRGBColorSpace;
            environment.needsUpdate = true;
            return environment;
        }

        createLighting() {
            const hemi = new THREE.HemisphereLight(0xbceeff, 0x20103f, 0.88);
            this.scene.add(hemi);

            const key = new THREE.DirectionalLight(0xffedcb, 2.55);
            key.position.set(-3.8, 7.4, 5.0);
            key.castShadow = true;
            key.shadow.mapSize.set(1024, 1024);
            key.shadow.radius = 4;
            key.shadow.camera.left = -5;
            key.shadow.camera.right = 5;
            key.shadow.camera.top = 5;
            key.shadow.camera.bottom = -5;
            key.shadow.camera.near = 0.1;
            key.shadow.camera.far = 20;
            key.shadow.bias = -0.00025;
            this.scene.add(key);

            const fill = new THREE.PointLight(0xff46d0, 1.08, 12, 2);
            fill.position.set(3.5, 3.2, 3.0);
            this.scene.add(fill);

            const rim = new THREE.PointLight(0x24eaff, 1.04, 11, 2);
            rim.position.set(-3.6, 3.0, 2.0);
            this.scene.add(rim);

            const gold = new THREE.PointLight(0xffc44f, 0.48, 9, 2);
            gold.position.set(0.8, 4.6, 3.8);
            this.scene.add(gold);

            // Existing white practical shapes a studio-like highlight on the
            // clearcoat without a texture, extra light, or idle render loop.
            const polish = new THREE.PointLight(0xffffff, 0.78, 10, 2);
            polish.position.set(-0.9, 3.7, 3.3);
            this.scene.add(polish);
        }

        createGround() {
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(14, 10),
                new THREE.ShadowMaterial({ color: 0x08051b, opacity: 0.11, depthWrite: false })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = this.groundY;
            ground.receiveShadow = true;
            ground.renderOrder = 0;
            this.scene.add(ground);

            const canvas = document.createElement('canvas');
            canvas.width = 96;
            canvas.height = 64;
            const context = canvas.getContext('2d');
            const gradient = context.createRadialGradient(48, 32, 2, 48, 32, 46);
            gradient.addColorStop(0, 'rgba(12,3,25,.72)');
            gradient.addColorStop(.50, 'rgba(12,3,25,.34)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 96, 64);
            this.shadowTexture = new THREE.CanvasTexture(canvas);
            this.shadowTexture.needsUpdate = true;
            this.shadowMaterial = new THREE.MeshBasicMaterial({
                map: this.shadowTexture,
                transparent: true,
                opacity: 0.60,
                depthWrite: false,
                toneMapped: false
            });
        }

        createRoundedBodyGeometry() {
            return this.model.createBodyGeometry();
        }

        cancelAnimation() {
            const animation = this.animation;
            if (!animation) return false;
            this.animation = null;
            this.rollToken += 1;
            this.stopLoop();
            if (animation.resolve) animation.resolve({ cancelled: true, token: animation.token });
            return true;
        }

        disposeDieInstance(die) {
            if (!die) return;
            const ownedGeometries = die.userData && die.userData.ownedGeometries;
            const ownedMaterials = die.userData && die.userData.ownedMaterials;
            if (Array.isArray(ownedGeometries)) {
                ownedGeometries.forEach((geometry) => geometry && geometry.dispose && geometry.dispose());
            }
            if (Array.isArray(ownedMaterials)) {
                ownedMaterials.forEach((material) => material && material.dispose && material.dispose());
            }
        }

        clearDice() {
            this.cancelAnimation();
            if (!this.diceRoot) {
                this.dice = [];
                return;
            }

            // Use the scene graph as the source of truth. This also removes any
            // orphaned groups left by an older renderer version.
            this.diceRoot.children.slice().forEach((die) => {
                this.diceRoot.remove(die);
                this.disposeDieInstance(die);
            });
            this.dice = [];
        }

        setDiceCount(count) {
            count = count === 3 ? 3 : 2;
            if (!this.diceRoot) {
                this.diceCount = count;
                return;
            }
            if (this.dice.length === count && this.diceRoot.children.length === count) {
                this.diceCount = count;
                this.layoutDice();
                return;
            }

            this.clearDice();
            this.diceCount = count;
            if (!this.bodyGeometry) this.bodyGeometry = this.createRoundedBodyGeometry();
            if (!this.pipGeometries) this.pipGeometries = [
                this.model.createPipGeometry(0), this.model.createPipGeometry(1)
            ];
            if (!this.holeMask) this.holeMask = this.model.createBodyHoleMask();

            for (let index = 0; index < count; index += 1) {
                this.dice.push(this.createDie(index));
            }
            this.layoutDice();
        }

        createDie(index) {
            const motion = new THREE.Group();
            const modelDie = this.model.createDieVisual(index, {
                bodyGeometry: this.bodyGeometry,
                pipGeometry: this.pipGeometries[index === 1 ? 1 : 0],
                holeMask: this.holeMask,
                envMap: this.studioEnvironment
            });
            const visual = modelDie.visual;

            const shadowGeometry = new THREE.PlaneGeometry(2.10, 1.42);
            const shadowInstanceMaterial = this.shadowMaterial.clone();
            const shadow = new THREE.Mesh(shadowGeometry, shadowInstanceMaterial);
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.z = 0.02;
            shadow.renderOrder = 1;
            motion.add(shadow);
            motion.add(visual);
            motion.userData = {
                visual,
                shadow,
                basePosition: new THREE.Vector3(),
                index,
                ownedGeometries: [shadowGeometry],
                ownedMaterials: modelDie.materials.concat(shadowInstanceMaterial)
            };
            motion.position.y = 0;
            visual.rotation.set(0, 0, 0);
            this.diceRoot.add(motion);
            return motion;
        }

        layoutDice() {
            if (!this.dice.length) return;
            const rect = this.host ? this.host.getBoundingClientRect() : { width: 1, height: 1 };
            const aspect = rect.width / Math.max(1, rect.height);
            const portrait = aspect < 1.1;
            // PerspectiveCamera uses a vertical FOV, so its horizontal field
            // narrows sharply on 320/360 px phones. Scale the whole formation,
            // not just each cube, to preserve a visible air gap without crop.
            const narrowFit = portrait ? Math.sqrt(clamp(aspect / 0.96, 0.60, 1)) : 1;
            const baseSpacing = this.diceCount === 3
                ? (portrait ? 1.26 : 1.54)
                : (portrait ? 1.90 : 2.12);
            const baseScale = (this.diceCount === 3
                ? (portrait ? 0.52 : 0.66)
                : (portrait ? 0.70 : 0.84)) * 1.20;
            const spacing = baseSpacing * narrowFit;
            const scale = baseScale * narrowFit;
            this.dieScale = scale;
            const middle = (this.dice.length - 1) / 2;
            this.dice.forEach((die, index) => {
                const x = (index - middle) * spacing;
                const y = this.groundY + this.bodyHalfHeight * scale;
                const z = this.diceCount === 3
                    ? (index === 1 ? -0.18 : 0.06)
                    : (index === 0 ? -0.08 : 0.10);
                die.userData.basePosition.set(x, y, z);
                die.scale.setScalar(1);
                die.userData.visual.scale.setScalar(scale);
                if (!this.animation) {
                    die.position.set(x, y, z);
                    this.syncShadow(die, 0);
                }
            });
        }

        syncShadow(die, height) {
            if (!die || !die.userData || !die.userData.shadow) return;
            const shadow = die.userData.shadow;
            const lift = Math.max(0, height || 0);
            const spread = this.dieScale * (1.04 + Math.min(lift, 1) * 0.20);
            shadow.position.y = this.groundY - die.position.y + 0.006;
            shadow.scale.set(spread, spread * 0.92, 1);
            shadow.material.opacity = clamp(0.60 - lift * 0.28, 0.24, 0.60);
        }

        resultTwist(index) {
            if (this.diceCount === 3) return [-0.09, 0.02, 0.10][index] || 0;
            return index === 0 ? -0.08 : 0.08;
        }

        targetQuaternion(value, twist) {
            return this.model.resultQuaternion(value, twist, this.resultUp);
        }

        showImmediate(values, options) {
            options = options || {};
            values = Array.isArray(values) && values.length ? values : [1, 1];
            this.currentValues = values.slice(0, 3).map((value) => clamp(Number(value) || 1, 1, 6));
            this.setDiceCount(this.currentValues.length);
            this.dice.forEach((die, index) => {
                const base = die.userData.basePosition;
                die.position.copy(base);
                die.userData.visual.scale.setScalar(this.dieScale);
                const value = this.currentValues[index] || 1;
                const quaternion = options.preview
                    ? this.model.previewQuaternion(value, index, this.diceCount, this.resultUp)
                    : this.targetQuaternion(value, this.resultTwist(index));
                die.userData.visual.quaternion.copy(quaternion);
                this.syncShadow(die, 0);
            });
            this.render();
        }

        roll(values) {
            values = Array.isArray(values) && values.length ? values : [1, 1];
            values = values.slice(0, 3).map((value) => clamp(Number(value) || 1, 1, 6));
            this.currentValues = values.slice();
            this.setDiceCount(values.length);

            if (!this.ready || this.contextLost) {
                if (this.fallback) this.fallback.hidden = false;
                return new Promise((resolve) => setTimeout(() => resolve({ fallback: true }), this.reducedMotion ? 320 : 820));
            }

            this.cancelAnimation();
            const token = ++this.rollToken;
            const duration = this.reducedMotion ? 380 : 1280;
            const started = global.performance && performance.now ? performance.now() : Date.now();
            const middle = (this.dice.length - 1) / 2;
            const plans = this.dice.map((die, index) => {
                const base = die.userData.basePosition.clone();
                const targetQuaternion = this.targetQuaternion(values[index] || 1, this.resultTwist(index));
                const tiltAxis = new THREE.Vector3(index % 2 ? 1 : -1, 0, index === 1 ? 0.35 : -0.28).normalize();
                const tiltAngle = (index % 2 ? 1 : -1) * (0.08 + Math.random() * 0.04);
                const landingTilt = new THREE.Quaternion().setFromAxisAngle(tiltAxis, tiltAngle);
                const landingQuaternion = landingTilt.multiply(targetQuaternion.clone());
                const spinAxis = new THREE.Vector3(
                    0.72 + Math.random() * 0.28,
                    0.45 + Math.random() * 0.30,
                    0.58 + Math.random() * 0.34
                ).normalize();
                return {
                    die,
                    base,
                    startQuaternion: die.userData.visual.quaternion.clone(),
                    landingQuaternion,
                    targetQuaternion,
                    spinAxis,
                    spinTurns: (index % 2 ? -1 : 1) * (3 + ((index + token) % 2)),
                    laneDirection: index === middle ? 0 : Math.sign(index - middle),
                    zDrift: index % 2 ? -0.10 : 0.08,
                    delay: index * (this.reducedMotion ? 12 : 42)
                };
            });

            return new Promise((resolve) => {
                this.animation = { token, started, duration, plans, resolve };
                this.startLoop();
            });
        }

        updateAnimation(now) {
            const animation = this.animation;
            if (!animation) return false;
            const elapsed = now - animation.started;
            const progress = clamp(elapsed / animation.duration, 0, 1);

            animation.plans.forEach((plan) => {
                const local = clamp((elapsed - plan.delay) / (animation.duration - plan.delay), 0, 1);
                const flightEnd = this.reducedMotion ? 0.68 : 0.62;
                const firstBounceEnd = this.reducedMotion ? 0.84 : 0.80;
                const secondBounceEnd = this.reducedMotion ? 0.93 : 0.91;
                let height = 0;
                let flight = 1;

                if (local < flightEnd) {
                    flight = local / flightEnd;
                    height = 4 * flight * (1 - flight) * (this.reducedMotion ? 0.22 : 0.76);
                } else if (local < firstBounceEnd) {
                    const bounce = (local - flightEnd) / (firstBounceEnd - flightEnd);
                    height = Math.sin(bounce * Math.PI) * (this.reducedMotion ? 0.055 : 0.15);
                } else if (local < secondBounceEnd) {
                    const bounce = (local - firstBounceEnd) / (secondBounceEnd - firstBounceEnd);
                    height = Math.sin(bounce * Math.PI) * (this.reducedMotion ? 0.018 : 0.052);
                }

                const outward = Math.sin(Math.min(flight, 1) * Math.PI) * plan.laneDirection * 0.15;
                const depthDrift = Math.sin(Math.min(flight, 1) * Math.PI * 2) * plan.zDrift;
                const x = plan.base.x + outward;
                const y = plan.base.y + height;
                const z = plan.base.z + depthDrift;
                plan.die.position.set(x, y, z);

                if (local < 0.72) {
                    const spinProgress = smoother(local / 0.72);
                    const baseQuaternion = plan.startQuaternion.clone().slerp(
                        plan.landingQuaternion,
                        smoother(local / 0.72)
                    );
                    const spinQuaternion = new THREE.Quaternion().setFromAxisAngle(
                        plan.spinAxis,
                        plan.spinTurns * Math.PI * 2 * spinProgress
                    );
                    plan.die.userData.visual.quaternion.copy(baseQuaternion).multiply(spinQuaternion);
                } else {
                    const settleProgress = settleEase((local - 0.72) / 0.28);
                    plan.die.userData.visual.quaternion.copy(plan.landingQuaternion).slerp(
                        plan.targetQuaternion,
                        settleProgress
                    );
                }
                plan.die.userData.visual.scale.setScalar(this.dieScale);
                this.syncShadow(plan.die, height);
            });

            if (progress >= 1) {
                animation.plans.forEach((plan) => {
                    plan.die.position.copy(plan.base);
                    plan.die.userData.visual.quaternion.copy(plan.targetQuaternion);
                    plan.die.userData.visual.scale.setScalar(this.dieScale);
                    this.syncShadow(plan.die, 0);
                });
                this.animation = null;
                if (this.pendingLayout) {
                    this.pendingLayout = false;
                    this.layoutDice();
                }
                animation.resolve({ values: this.currentValues.slice(), token: animation.token });
                return false;
            }
            return true;
        }

        startLoop() {
            if (this.raf || document.hidden) return;
            const frame = (now) => {
                this.raf = 0;
                if (this.contextLost) return;
                const active = this.updateAnimation(now);
                this.render();
                if (active) this.raf = global.requestAnimationFrame(frame);
            };
            this.raf = global.requestAnimationFrame(frame);
        }

        stopLoop() {
            if (!this.raf) return;
            global.cancelAnimationFrame(this.raf);
            this.raf = 0;
        }

        render() {
            if (!this.renderer || !this.scene || !this.camera || this.contextLost) return;
            this.renderer.render(this.scene, this.camera);
        }

        getDebugState() {
            let bodyCount = 0;
            if (this.diceRoot) {
                this.diceRoot.traverse((node) => {
                    if (node && typeof node.name === 'string' && node.name.indexOf('die-body-') === 0) {
                        bodyCount += 1;
                    }
                });
            }
            return {
                expectedCount: this.diceCount,
                trackedCount: this.dice.length,
                rootCount: this.diceRoot ? this.diceRoot.children.length : 0,
                bodyCount,
                values: this.currentValues.slice(),
                animating: !!this.animation
            };
        }

        resize() {
            if (!this.renderer || !this.camera || !this.canvas || !this.host) return;
            const rect = this.host.getBoundingClientRect();
            const width = Math.max(1, Math.floor(rect.width));
            const height = Math.max(1, Math.floor(rect.height));
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height, false);
            if (this.animation) this.pendingLayout = true;
            else this.layoutDice();
            this.render();
        }

        useFallback() {
            this.ready = false;
            this.stopLoop();
            if (this.host) this.host.classList.remove('dice-webgl-ready');
            if (this.canvas) {
                this.canvas.hidden = true;
                this.canvas.style.display = 'none';
            }
            if (this.fallback) {
                this.fallback.hidden = false;
                this.fallback.setAttribute('data-renderer', 'css-fallback');
            }
            return false;
        }

        destroy() {
            this.clearDice();
            if (this.resizeObserver) this.resizeObserver.disconnect();
            if (this.resizeHandler) global.removeEventListener('resize', this.resizeHandler);
            if (this.bodyGeometry) this.bodyGeometry.dispose();
            if (this.pipGeometries) this.pipGeometries.forEach((geometry) => geometry.dispose());
            if (this.holeMask) this.holeMask.dispose();
            if (this.studioEnvironment) this.studioEnvironment.dispose();
            if (this.shadowMaterial) this.shadowMaterial.dispose();
            if (this.shadowTexture) this.shadowTexture.dispose();
            if (this.renderer) this.renderer.dispose();
            this.ready = false;
        }
    }

    global.Dice3DRenderer = Dice3DRenderer;
})(window);
