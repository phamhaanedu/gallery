class CanvasStitchViewer {
    constructor(canvas, srcA, srcB) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false }); // Optimization: No transparency

        this.imgA = new Image();
        this.imgB = new Image();

        this.viewport = {
            x: 0,
            y: 0,
            scale: 1
        };

        // Interaction State
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;

        this.imgA.src = srcA;
        this.imgB.src = srcB;

        Promise.all([
            new Promise(r => this.imgA.onload = r),
            new Promise(r => this.imgB.onload = r)
        ]).then(() => this.init());
    }

    init() {
        this.resize();
        this.hardenCanvas();
        this.attachEvents(); // Attach interaction listeners

        // Initial Fit
        // Wait for images if not loaded? Promise.all in constructor ensures loading.
        this.fitToScreen();

        window.addEventListener('resize', () => {
            this.resize();
            this.fitToScreen(); // Keep fitting on resize? Or maintain relative? Let's fit for now to be safe.
        });
    }

    fitToScreen() {
        const totalW = this.imgA.width + this.imgB.width;
        const totalH = this.imgA.height; // Assuming same height

        const canvasW = this.canvas.width; // Real pixels
        const canvasH = this.canvas.height;

        const scaleX = canvasW / totalW;
        const scaleY = canvasH / totalH;

        // Fit Contain (keep aspect ratio, fit within screen)
        // Use 0.9 factor for padding
        let scale = Math.min(scaleX, scaleY) * 0.95;

        this.viewport.scale = scale;

        // Center
        // Rendered Width = totalW * scale
        // Center X: (canvasW - RenderedW) / 2
        // We render at -viewport.x.
        // So -viewport.x = (canvasW - RenderedW) / 2
        // viewport.x = -(canvasW - RenderedW) / 2

        const renderedW = totalW * scale;
        const renderedH = totalH * scale;

        this.viewport.x = -(canvasW - renderedW) / 2;
        this.viewport.y = -(canvasH - renderedH) / 2;

        this.render();
    }

    attachEvents() {
        const c = this.canvas;

        // Wheel Zoom
        c.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            // Get mouse position relative to canvas (CSS pixels)
            const rect = c.getBoundingClientRect();
            // Convert to Canvas Pixels (Device Pixels)
            const cx = (e.clientX - rect.left) * devicePixelRatio;
            const cy = (e.clientY - rect.top) * devicePixelRatio;

            this.zoom(delta, cx, cy);
        }, { passive: false });

        // Mouse Pan
        c.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only left click
            this.isDragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            c.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            e.preventDefault();

            // Delta in CSS pixels
            let dx = e.clientX - this.lastX;
            let dy = e.clientY - this.lastY;

            this.lastX = e.clientX;
            this.lastY = e.clientY;

            // Convert to Canvas Pixels
            dx *= devicePixelRatio;
            dy *= devicePixelRatio;

            this.pan(dx, dy);
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            c.style.cursor = 'grab';
        });

        // Touch Support (Basic Pan)
        c.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.lastX = e.touches[0].clientX;
                this.lastY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                // Pinched Zoom (Basic)
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                this.lastDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            }
        });

        window.addEventListener('touchmove', (e) => {
            // Basic Pan
            if (this.isDragging && e.touches.length === 1) {
                // e.preventDefault(); 
                let dx = e.touches[0].clientX - this.lastX;
                let dy = e.touches[0].clientY - this.lastY;
                this.lastX = e.touches[0].clientX;
                this.lastY = e.touches[0].clientY;
                dx *= devicePixelRatio;
                dy *= devicePixelRatio;
                this.pan(dx, dy);
            }
            // Pinch Zoom
            else if (e.touches.length === 2) {
                e.preventDefault();
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

                if (this.lastDist > 0) {
                    const delta = currentDist / this.lastDist;

                    // Center point in CSS pixels
                    const centerX = (t1.clientX + t2.clientX) / 2;
                    const centerY = (t1.clientY + t2.clientY) / 2;

                    const rect = this.canvas.getBoundingClientRect();
                    const cx = (centerX - rect.left) * devicePixelRatio;
                    const cy = (centerY - rect.top) * devicePixelRatio;

                    this.zoom(delta, cx, cy);
                }
                this.lastDist = currentDist;
            }
        });

        window.addEventListener('touchend', () => {
            this.isDragging = false;
            this.lastDist = 0;
        });
    }

    resize() {
        // Fit canvas to fill container
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width * devicePixelRatio;
        this.canvas.height = rect.height * devicePixelRatio;

        // CSS size for sharpness
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        // Do not call render here, let fitToScreen or interaction handle it.
        // Actually fitToScreen calls render.
    }

    render() {
        const ctx = this.ctx;
        ctx.save();

        // Clear entire canvas in device pixels (Absolute coordinates)
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply Viewport Transform
        ctx.setTransform(
            this.viewport.scale, 0, 0, this.viewport.scale,
            -this.viewport.x, -this.viewport.y
        );

        ctx.drawImage(this.imgA, 0, 0);
        ctx.drawImage(this.imgB, this.imgA.width, 0);

        ctx.restore();
    }

    zoom(delta, cx, cy) {
        // cx, cy are in SCREEN (Canvas) Coordinates (pixels)
        // We need to convert to WORLD coordinates to keep them stable.

        // WorldX = (ScreenX + ViewportX) / Scale
        const worldX = (cx + this.viewport.x) / this.viewport.scale;
        const worldY = (cy + this.viewport.y) / this.viewport.scale;

        const prev = this.viewport.scale;
        this.viewport.scale = Math.max(0.1, Math.min(10, prev * delta));

        // We want (worldX, worldY) to remain at (cx, cy) on screen.
        // NewScreenX = (WorldX * NewScale) - NewViewportX
        // cx = (worldX * scale) - NewViewportX
        // NewViewportX = (worldX * scale) - cx

        this.viewport.x = (worldX * this.viewport.scale) - cx;
        this.viewport.y = (worldY * this.viewport.scale) - cy;

        this.render();
    }

    pan(dx, dy) {
        // Dragging adds to Image position.
        // ImagePos = -ViewportPos.
        // NewImagePos = ImagePos + dx.
        // -NewViewportPos = -ViewportPos + dx.
        // NewViewportPos = ViewportPos - dx.
        this.viewport.x -= dx;
        this.viewport.y -= dy;
        this.render();
    }

    // Public Control Methods
    zoomIn() {
        // Zoom center of screen
        this.zoom(1.3, this.canvas.width / 2, this.canvas.height / 2);
    }

    zoomOut() {
        this.zoom(0.7, this.canvas.width / 2, this.canvas.height / 2);
    }

    reset() {
        this.fitToScreen();
    }

    hardenCanvas() {
        ['toDataURL', 'toBlob', 'getImageData'].forEach(fn => {
            if (this.canvas[fn]) {
                Object.defineProperty(this.canvas, fn, {
                    value: () => { throw new Error('Canvas export disabled'); },
                    configurable: false,
                    writable: false
                });
            }
        });
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    // Helper to destroy events if needed
    dispose() {
        // Remove window listeners?
        // Implementation limitation: Named wrapper functions needed for clean remove.
        // For now, rely on page reload or simple cleanup.
    }
}
