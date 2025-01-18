// import * as THREE from 'three';

/**
 * 
 * @param {keyof HTMLElementTagNameMap} tagName 
 * @param {object} properties 
 * @returns {HTMLElement}
 */
function createElement(tagName, properties = {}) {
    const element = document.createElement(tagName);

    for (const propertyName in properties) {

        try {
            const propertyValue = properties[propertyName];
            element[propertyName] = propertyValue;
        } catch (e) {
            console.warn("The element "+tagName+" does not have the property "+propertyName+".");
        }
    }

    return element;
}

const backwardsLimits = [
    new Vector(637.285, 441.305),
    new Vector(335.561, 532.950)
]

const forwardsLimits = [
    new Vector(122.663, 468.293),
    new Vector(377.859, 518.472)
]

class CanvasManager {

    areChanges = false;

    scale = 1

    /**@type {HTMLCanvasElement} */
    canvasElement;

    /**@type {CanvasRenderingContext2D} */
    context;

    currentImageUrl = "";
    templateImageUrl = "oversized-t-shirt/alternative_textures/black.png";

    enableStroke = false;

    templateImage;
    currentImage;

    /**@type {Vector} */
    imagePosition;

    /**@type {Vector} */
    imagePositionPercent = Vector.zero();

    imageRotation = 0;

    /**@type {Array<Vector>} */
    imageLimit = [Vector.zero(), new Vector(1080, 1080)]

    imageMaxSize = new Vector(218.998, 334.260);

    textureLoader = new THREE.TextureLoader();
    loadedTextures = {};

    setImageRotation(newRotation) {
        if (typeof newRotation != "number") {
            return;
        }

        newRotation = Math.max(-360, Math.min(360, newRotation));
        this.imageRotation = newRotation;
        this.areChanges = true;
    }

    setCurrentImageUrl(newUrl) {
        
        if (typeof newUrl != "string") {
            return;
        }

        this.currentImageUrl = newUrl;
        this.currentImage.src = newUrl;        
    }

    setImagePositionPercent(newPercent) {
        
        if (!newPercent instanceof Vector) {
            return;
        }

        this.imagePositionPercent = newPercent.clamp(Vector.zero(), Vector.both(1));
        this.areChanges = true;
    }
    
    centerImagerHorizontally() {
        this.imagePositionPercent.x = 0.5;
        this.areChanges = true;
    }

    centerImageVertically() {
        this.imagePositionPercent.y = 0.5;
        this.areChanges = true;
    }

    getMaxImagePosition() {
        return this.imageLimit[1].sum(this.getImageSize().negative());
    }

    getClampedImagePosition() {
        return this.imagePosition.clamp(this.imageLimit[0], this.getMaxImagePosition());
    }

    getImageSize() {
        const naturalSize = new Vector(this.currentImage.naturalWidth, this.currentImage.naturalHeight);

        const heightAspectRatio = this.imageMaxSize.y / naturalSize.y;
        const widthAspectRatio = this.imageMaxSize.x / naturalSize.x;

        let newSize = new Vector(this.imageMaxSize.x, naturalSize.y * widthAspectRatio);

        if (newSize.y > this.imageMaxSize.y) {
            newSize = new Vector(naturalSize.x * heightAspectRatio, this.imageMaxSize.y);
        }

        return newSize;
    }

    getImageUrl() {
        return this.canvasElement.toDataURL();
    }

    async animate() {

        if (this.templateImage instanceof Image && this.templateImage.complete) {
            
            this.canvasElement.width = this.templateImage.naturalWidth;
            this.canvasElement.height = this.templateImage.naturalHeight;

            this.context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
            const imageSize = this.getImageSize();

            const scaleAdjustment = (1 - this.scale) * 0.5

            const maxImagePosition = this.getMaxImagePosition().sum(imageSize.multiply(scaleAdjustment * 2));
            const minImagePosition = this.imageLimit[0].sum(imageSize.multiply(-scaleAdjustment));

            this.imagePosition = maxImagePosition.multiply(this.imagePositionPercent.sum(minImagePosition.divide(maxImagePosition)));
            this.imagePositionPercent = this.imagePositionPercent.clamp(Vector.zero(), Vector.both(1));

            this.context.drawImage(this.templateImage, 0, 0);

            if (this.enableStroke) {
                this.context.strokeRect(
                    this.imageLimit[0].x,
                    this.imageLimit[0].y,
                    this.imageLimit[1].x,
                    this.imageLimit[1].y
                );

                this.context.stroke();
            }

            this.context.save();

            if (this.currentImage instanceof Image && this.currentImage.complete) {
               
                this.context.translate(this.imagePosition.x + imageSize.x * 0.5, this.imagePosition.y + imageSize.y * 0.5);
                this.context.rotate(this.imageRotation * Math.PI / 180);
                this.context.scale(this.scale, this.scale);

                this.context.drawImage(
                    this.currentImage,

                    -imageSize.x * 0.5,
                    -imageSize.y * 0.5,

                    imageSize.x,
                    imageSize.y,
                );
            }

            this.context.restore();
        }

        requestAnimationFrame(this.animate.bind(this));
    }

    constructor(parentElement = null, templateImageUrl = "", currentImageUrl = "", imagePercent = Vector.zero(), imageLimit = [[Vector.zero(), new Vector(1080, 1080)]]) {
        this.canvasElement = createElement("canvas", { "style": "display:none;"});
        this.context = this.canvasElement.getContext("2d");
        
        this.templateImageUrl = templateImageUrl;
        this.currentImageUrl = currentImageUrl;

        this.templateImage = new Image();
        this.templateImage.src = this.templateImageUrl;

        this.currentImage = new Image();
        this.currentImage.src = this.currentImageUrl;

        this.currentImage.onload = () => {
            this.areChanges = true;
            this.loadedTextures = {};
        };

        this.templateImage.onload = () => {
            this.areChanges = true;
            this.loadedTextures = {};
        };

        this.imageLimit = imageLimit;
        this.imagePosition = Vector.zero();

        this.imagePositionPercent = imagePercent;

        if (parentElement instanceof HTMLElement) {
            parentElement.appendChild(this.canvasElement);
        }

        this.animate();
    }
}

class Shirt3DViewer {

    scene;
    camera;
    renderer;

    shirt = null;
    isDragging = false;
    isMouseIn = false;
    waitingForTextureLoad = false;

    lastTouchPosition;
    shirtTargetRotation = new Vector();
    cameraFovTarget = 53;

    progressBarTargetValue = 0;

    container = createElement("div", {
        "id": "shirt-viewer-container"
    });

    placeholderForeground = createElement("div", {
        "className": "placeholder-foreground"
    });

    placeholderSpinner = createElement("div", {
        "className":"spin"
    })

    progressBar = createElement("div", {
        "className": "progressbar-bg"
    });

    progressBarForeground = createElement("div", {
        "className":"progressbar-fg"
    })

    COLORS = {
        blank: new THREE.Color(0xffffff),
        black: new THREE.Color(0x000000),
        gray: new THREE.Color(0xCECECE)
    }

    styles = [
    
        this.makeStyle('oversized-t-shirt/oversized-tshirt_diffuse_1001.png', '#ffffff', this.COLORS.gray),
        this.makeStyle('oversized-t-shirt/alternative_textures/red.png', '#e40000'),
        this.makeStyle('oversized-t-shirt/alternative_textures/blue.png', '#0000de'),
        this.makeStyle('oversized-t-shirt/alternative_textures/whiteblue.png', '#00e3e5'),
        this.makeStyle('oversized-t-shirt/alternative_textures/purple.png', '#d400e4'),
        this.makeStyle('oversized-t-shirt/alternative_textures/pink.png', '#f76cf5'),
        this.makeStyle('oversized-t-shirt/alternative_textures/yellow.png', '#e3e500'),
        this.makeStyle('oversized-t-shirt/alternative_textures/orange.png', '#ff9c21'),
        this.makeStyle('oversized-t-shirt/alternative_textures/black.png', '#1b1b1b'),
    ]

    textureLoader = new THREE.TextureLoader();

    backgroundTexture = null;
    foregroundTexture = null;

    currentStyle = this.styles[0];

    /**
     * 
     * @param {'progressBar'|'spinner'|'none'} mode 
     */
    setMode(mode) {
        switch (mode) {
            case 'progressBar':
                this.placeholderSpinner.classList.add("hidden");
                this.progressBar.classList.remove("hidden");

                this.placeholderForeground.classList.remove("hidden");
                break;
            
            case 'spinner':
                this.placeholderSpinner.classList.remove("hidden");
                this.progressBar.classList.add("hidden");

                this.placeholderForeground.classList.remove("hidden");

                break;
        
            default:
                this.placeholderForeground.classList.add("hidden");
                break;
        }
    }

    makeStyle(texturePath, representativeColor = '#ffffff', backgroundColor = this.COLORS.blank) {
        return {
            'texturePath': texturePath,
            'backgroundColor': backgroundColor,
            'representativeColor': (representativeColor.startsWith("#")) ? representativeColor : "#" + representativeColor
        };
    }

    loadTexture(texturePath) {
        return new Promise(resolve => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(texturePath, (texture) => {
                resolve(texture);
            });
        });
    }


    onMouseMove = (e) => {

        if (this.shirt != null && this.isDragging && e instanceof MouseEvent) {
            this.shirtTargetRotation = this.shirtTargetRotation.sum((new Vector(e.movementX, e.movementY)).divide(180.0).multiply(1.2));
            document.body.style.cursor = "move";
        } else if (e instanceof TouchEvent) {
            e.preventDefault();

            const touch = e.touches[0];

            if (this.lastTouchPosition == null) {
                this.lastTouchPosition = new Vector(touch.clientX, touch.clientY);
                return;
            }

            const currenTouchPosition = new Vector(touch.clientX, touch.clientY);
            const speed = currenTouchPosition.sum(this.lastTouchPosition.negative());
            this.lastTouchPosition = currenTouchPosition;

            this.shirtTargetRotation = this.shirtTargetRotation.sum(speed.divide(180.0).multiply(1.2));
        }
    }

    clampShirtTargetRotation() {
        this.shirtTargetRotation = this.shirtTargetRotation.clamp(this.minTargetRotation, this.maxTargetRotation);
    }

    onMouseUp = (e) => {
        this.isDragging = false;
        document.body.style.cursor = "unset";

        if (e instanceof TouchEvent) {
            this.lastTouchPosition = null;
        }

    }

    canvasManagerChangesOffset = 0;

    async animate() {

        if (this.shirt != null) {

            // console.log(Math.round(Math.sin(this.shirt.rotation.y) * 100) / 100) ;

            this.shirt.children[0].material.map.needsUpdate = true;

            // if (this.canvasManager instanceof CanvasManager && this.canvasManager.areChanges) {
                
            //     const newFrame = await this.canvasManager.getFrame();

            //     if (newFrame) {
            //         this.shirt.children[0].material.map = newFrame;
            //         this.shirt.children[0].material.needsUpdate = true;
            //         this.setMode("none");
            //         this.canvasManager.areChanges = false;
            //     }

            // }
            
            this.clampShirtTargetRotation();

            this.shirt.rotation.x += (this.shirtTargetRotation.y - this.shirt.rotation.x) * 0.18;
            this.shirt.rotation.y += (this.shirtTargetRotation.x - this.shirt.rotation.y) * 0.18;
            
            this.cameraFovTarget = Math.max(50, Math.min(78, this.cameraFovTarget));
            const cameraNewFov = this.camera.fov + (this.cameraFovTarget - this.camera.fov) * 0.18;
            
            if (cameraNewFov !== this.camera.fov) {
                this.camera.fov = cameraNewFov;
                this.camera.updateProjectionMatrix();
            }

            if (this.waitingForTextureLoad) {
                if (this.shirt != null) {
                    if (!this.shirt.children[0].material.needsUpdate) {
                        this.setMode("none");
                        this.waitingForTextureLoad = false;
                    }
                }
            }

        }

        const currentProgress = Math.max(0.01, this.progressBarForeground.offsetWidth) / this.progressBar.offsetWidth;
        this.progressBarForeground.style.width = `${(currentProgress + (this.progressBarTargetValue - currentProgress) * 0.18) * 100}%`;

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.animate.bind(this));
    }

    async setStyle(newStyle, loadingMode = false, updateCanvas = true) {
        if (this.shirt != null) {

            if (loadingMode) {
                // this.setMode('spinner');
            }

            this.scene.background = newStyle.backgroundColor;

            if (this.canvasManager instanceof CanvasManager && updateCanvas) {
                this.canvasManager.templateImageUrl = newStyle.loadedTexture;
                this.canvasManager.templateImage.src = newStyle.loadedTexture;

            }
            
            if (typeof this.canvasManager == "undefined" || this.canvasManager == null) {

                this.canvasManager = new CanvasManager(this.container.parentElement, newStyle.texturePath, '', Vector.both(0.5), forwardsLimits);
                this.canvasTexture = new THREE.CanvasTexture(this.canvasManager.canvasElement);

                this.shirt.children[0].material.map = this.canvasTexture;
            }
        }
    }

    pushShirtModel(modelUrl) {
        const loader = new THREE.OBJLoader();

        this.setMode('progressBar');
        this.progressBarTargetValue = 0;

        loader.load(
            modelUrl,

            (object) => {
                this.scene.add(object);
                
                this.shirt = object;

                this.shirtTargetRotation.x = this.shirt.rotation.y;
                this.shirtTargetRotation.y = this.shirt.rotation.x;

                this.setStyle(this.styles[0]);
                this.setMode("none");
            },

            (xhr) => {

                if (typeof shirtLoadingProgress == "function") {
                    shirtLoadingProgress(xhr.loaded / xhr.total);
                }

                this.progressBarTargetValue = xhr.loaded / xhr.total;

            },

            (error) => {
                console.log('Ocurrió un error al cargar el modelo.', error);
            }
        );
    }

    downloadAndDecompress3DModel() {

        const xhr = new XMLHttpRequest();

        this.setMode('progressBar');

        xhr.open("GET", "shirt_model.zip");

        xhr.onprogress = (e => {
            const percent = e.loaded / e.total;
            if (isFinite(percent)) {
                console.log("Downloading compressed shirt model", (percent * 100.0).toFixed(2).toString() + "%");
                this.progressBarTargetValue = percent; 
            }
        }).bind(this);

        xhr.onload = e => {
            if (xhr.status !== 200) {
                console.error("Could not download the shirt model.");
                return;
            }

            console.log("Compressed shirt model downloaded. Decompressing.");

            this.setMode("spinner");
            
            const encodedModel = xhr.response;

            JSZip.loadAsync(encodedModel).then(files => {
                files.forEach((filename, file) => {
                    file.async('blob').then((decodedModel) => {
                        const modelUrl = URL.createObjectURL(decodedModel);                        
                        console.log("Model decompressed. URL: ", modelUrl);
                        this.pushShirtModel(modelUrl);
                    });
                });
            });
    
        }

        xhr.responseType = 'arraybuffer';
        xhr.send();
    }

    constructor(parentElement, aspectRatio, shirtLoadingProgress, minTargetRotation = new Vector(NaN, -0.38), maxTargetRotation = new Vector(NaN, 1)) {
        if (parentElement instanceof HTMLElement) {   
            parentElement.appendChild(this.container);
        }
        

        this.minTargetRotation = minTargetRotation;
        this.maxTargetRotation = maxTargetRotation;

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(74, aspectRatio, 0.1, 500);
        this.camera.position.z = 1;

        this.renderer = new THREE.WebGLRenderer();
        this.container.appendChild(this.renderer.domElement);
        
        this.container.appendChild(this.placeholderForeground);
        this.placeholderForeground.appendChild(this.placeholderSpinner);

        this.placeholderForeground.appendChild(this.progressBar);
        this.progressBar.appendChild(this.progressBarForeground);

        const rendererSize = (new Vector(this.container.offsetWidth, this.container.offsetHeight)).multiply(1.3)
        this.renderer.setSize(rendererSize.x, rendererSize.y);

        window.addEventListener("resize", () => {
            this.renderer.setSize(rendererSize.x, rendererSize.y);
            this.camera.updateProjectionMatrix();
        });


        this.renderer.domElement.id = "shirt-render"

        this.renderer.domElement.addEventListener("mouseenter", () => { this.isMouseIn = true });
        this.renderer.domElement.addEventListener("mouseout", () => { this.isMouseIn = false });

        this.renderer.domElement.addEventListener("wheel", (e) => {

            if (this.isMouseIn) {
                e.preventDefault();
                this.cameraFovTarget += e.deltaY / 25
            }
        });

        this.renderer.domElement.addEventListener("mousedown", () => this.isDragging = true);
        this.renderer.domElement.addEventListener("touchdown", () => this.isDragging = true);

        this.renderer.domElement.addEventListener("mouseup", this.onMouseUp);
        this.renderer.domElement.addEventListener("touchup", this.onMouseUp);
        this.renderer.domElement.addEventListener("touchcancel", this.onMouseUp);
        this.renderer.domElement.addEventListener("touchend", this.onMouseUp);
        window.addEventListener("mouseout", this.onMouseUp);

        this.renderer.domElement.addEventListener("mousemove", this.onMouseMove);
        this.renderer.domElement.addEventListener("touchmove", this.onMouseMove);
        
        const lightsValues = [
            [0.46, new Vector(-5, 0)],
            [0.6, new Vector(0, 5)],
            [0.6, new Vector(5, 0)]
        ]

        for (const lightValues of lightsValues) {
            const brightness = lightValues[0];
            const position = lightValues[1];

            const light = new THREE.DirectionalLight(this.COLORS.blank, brightness);
            light.position.set(position.x, position.y, 0).normalize();
            this.scene.add(light);
        }

        const light = new THREE.DirectionalLight(this.COLORS.blank, 0.8);
        light.position.set(0, 0, 5).normalize();
        this.scene.add(light);


        this.downloadAndDecompress3DModel();
        this.animate();
    }
}