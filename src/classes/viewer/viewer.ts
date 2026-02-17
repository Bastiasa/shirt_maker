// viewer.ts

import * as THREE from 'three';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js'
import JSZip from 'jszip';
import { createElement } from '../../utils/createElement';
import { Vector } from '../vector';
import { ElementBuilder } from '../element-builder';

import './viewer-style.css';
import { isTouchEvent } from '../../utils/isTouchEvent';
import type { PhongLightingModel } from 'three/webgpu';
import { BufferGeometryUtils, GLTFLoader } from 'three/examples/jsm/Addons.js';

declare global {
    interface Window {
        shirtObject:THREE.Object3D;
        shirt: ShirtModel;
    }
}

export const backwardsLimits = [
    new Vector(606.545, 134.339),
    new Vector(324.255, 598.978)
] as const;

export const forwardsLimits = [
    new Vector(77.791, 98.222),
    new Vector(353.148, 614.664)
] as const;

export class CanvasManager {

    areChanges = false;

    scale = 1
    readonly canvasElement:HTMLCanvasElement = ElementBuilder
        .start('canvas')
        .setStyle('display', 'none')
        .setStyle('width', "512px")
        .setStyle('height', "auto")
        .build();
    
    context:CanvasRenderingContext2D = this.canvasElement.getContext('2d') as CanvasRenderingContext2D;

    private _texture?:THREE.CanvasTexture;

    public get texture() {
        return this._texture;
    }
    
    public get stampTextureUrl() : string {
        return this.stampTexture.src;
    }

    public set stampTextureUrl(value:string|undefined) {
        this.stampTexture.src = value ?? "";
    };

    public get styleTextureUrl() {
        return this.styleTexture.src;
    }

    public set styleTextureUrl(value:string) {
        this.styleTexture.src = value ?? "";
    };

    

    enableStroke = false;

    private styleTexture = new Image();
    private stampTexture = new Image();

    imagePosition:Vector;
    imagePositionPercent:Vector = Vector.zero();

    imageRotation = 0;
    imageLimit:readonly [Vector, Vector] = [Vector.zero(), new Vector(1080, 1080)]

    imageMaxSize = new Vector(218.998, 334.260);

    textureLoader = new THREE.TextureLoader();
    loadedTextures = {};

    setImageRotation(newRotation:number) {
        if (typeof newRotation != "number") {
            return;
        }

        newRotation = Math.max(-360, Math.min(360, newRotation));
        this.imageRotation = newRotation;
        this.areChanges = true;
    }

    setImagePositionPercent(newPercent:Vector) {
        
        if (!(newPercent instanceof Vector)) {
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
        const naturalSize = new Vector(this.stampTexture.naturalWidth, this.stampTexture.naturalHeight);

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

    
    private lastWidth = 0;
    private lastHeight = 0;

    private setCanvasUpSize() {

        const newWidth = this.styleTexture.naturalWidth;
        const newHeight = this.styleTexture.naturalHeight;

        if (newWidth != this.lastWidth) {
            this.canvasElement.width = newWidth;
            this.lastWidth = newWidth;        
        }

        if (newHeight != this.lastHeight) {
            this.canvasElement.height = newHeight;
            this.lastHeight = newHeight;
        }
    }

    private drawStamp(imageSize:Vector) {
        if (!this.stampTexture.complete) {
            return;
        }

        this.context.translate(this.imagePosition.x + imageSize.x * 0.5, this.imagePosition.y + imageSize.y * 0.5);
        this.context.rotate(this.imageRotation * Math.PI / 180);
        this.context.scale(this.scale, this.scale);

        this.context.drawImage(
            this.stampTexture,

            -imageSize.x * 0.5,
            -imageSize.y * 0.5,

            imageSize.x,
            imageSize.y,
        );
    }

    private async animationFrame() {

        if (!this.styleTexture.complete) {
            return;
        }

        this.context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        const imageSize = this.getImageSize();

        const scaleAdjustment = (1 - this.scale) * 0.5

        const maxImagePosition = this.getMaxImagePosition().sum(imageSize.multiply(scaleAdjustment * 2));
        const minImagePosition = this.imageLimit[0].sum(imageSize.multiply(-scaleAdjustment));

        this.imagePosition = maxImagePosition.multiply(this.imagePositionPercent.sum(minImagePosition.divide(maxImagePosition)));
        this.imagePositionPercent = this.imagePositionPercent.clamp(Vector.zero(), Vector.both(1));

        this.context.drawImage(this.styleTexture, 0, 0);

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
        
        this.drawStamp(imageSize);
        
        this.context.restore();

        if (this.texture) {
            this.texture.needsUpdate = true;        
        }
    }

    private async runAnimation() {
        await this.animationFrame();
        requestAnimationFrame(this.runAnimation.bind(this));
    }

    constructor(
        parentElement:HTMLElement|null = null, 
        private readonly onTextureLoaded?:(texture:THREE.CanvasTexture)=>void,
        styleTextureUrl = "", 
        stampTextureUrl?:string, 
        imagePercent = Vector.zero(), 
        imageLimit:readonly [Vector, Vector] = [Vector.zero(), new Vector(1080, 1080)]
    ) {

        this.styleTextureUrl = styleTextureUrl;
        this.stampTextureUrl = stampTextureUrl;

        this.styleTexture.onload = () => {
            this.areChanges = true;
            
            this.loadedTextures = {};

            this._texture = new THREE.CanvasTexture(this.canvasElement);
            this._texture.flipY = false;
            this.setCanvasUpSize();
            console.log("New texture style loaded.");
            
            this.onTextureLoaded?.(this._texture);
        };

        this.stampTexture.onload = () => {
            this.areChanges = true;
            this.loadedTextures = {};
        };

        this.imageLimit = imageLimit;
        this.imagePosition = Vector.zero();

        this.imagePositionPercent = imagePercent;

        parentElement?.appendChild(this.canvasElement);
        console.log("Canvas manager texture: ", this.texture);

        this.runAnimation();
    }
}

type ColorHEXString = `#${string}`;

export class ShirtStyle {

    static readonly BACKGROUND_COLORS = {
        blank: new THREE.Color(0xffffff),
        black: new THREE.Color(0x000000),
        gray: new THREE.Color(0xCECECE)
    } as const;

    static readonly styles = [
        this.makeStyle('white.png', '#ffffff', this.BACKGROUND_COLORS.gray),
        this.makeStyle('red.png', '#e40000'),
        this.makeStyle('blue.png', '#0000de'),
        this.makeStyle('whiteblue.png', '#00e3e5'),
        this.makeStyle('purple.png', '#d400e4'),
        this.makeStyle('pink.png', '#f76cf5'),
        this.makeStyle('yellow.png', '#e3e500'),
        this.makeStyle('orange.png', '#ff9c21'),
        this.makeStyle('black.png', '#1b1b1b'),
    ] as const satisfies ShirtStyle[];

    static makeStyle(
        textureName:string, 
        representativeColor:ColorHEXString = '#ffffff', 
        backgroundColor = this.BACKGROUND_COLORS.blank
    ) {
        return new ShirtStyle(
            `/model/textures/${textureName}`,
            backgroundColor,
            ((representativeColor.startsWith("#")) ? representativeColor : "#" + representativeColor) as ColorHEXString
        );
    }

    constructor(
        public readonly texturePath:string,
        public readonly backgroundColor: THREE.Color,
        public readonly representativeColor: ColorHEXString
    ) {
    }
}


class ShirtModel {

    readonly mesh:THREE.Mesh;

    get material(){
        return this.mesh.material as THREE.MeshPhongMaterial;
    }

    constructor(
        readonly container:THREE.Object3D,
    ) {

        const givenMesh = container.children[0];
        
        if (!givenMesh) {
            throw new Error("Object3D is empty");
        }

        if (!(givenMesh instanceof THREE.Mesh)) {
            throw new Error("Object doesn't contain a Mesh");
        }
        
        this.mesh = givenMesh;
    }
}


type ViewerMode = 'progressBar'|'spinner'|'none';



export class Shirt3DViewer {

    canvasManager?:CanvasManager;

    scene: THREE.Scene = new THREE.Scene();
    camera: THREE.PerspectiveCamera;
    renderer = new THREE.WebGLRenderer();

    shirt:ShirtModel|null = null;
    isDragging = false;
    isMouseIn = false;
    waitingForTextureLoad = false;

    lastTouchPosition:Vector|null = null;
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



    textureLoader = new THREE.TextureLoader();

    backgroundTexture = null;
    foregroundTexture = null;

    currentStyle = ShirtStyle.styles[0];

    setMode(mode:ViewerMode) {
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

    loadTexture(texturePath:string) {
        return new Promise(resolve => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(texturePath, (texture) => {
                resolve(texture);
            });
        });
    }


    onMouseMove = (e:MouseEvent|Event) => {

        if (this.shirt != null && this.isDragging && e instanceof MouseEvent) {
            this.shirtTargetRotation = this.shirtTargetRotation.sum((new Vector(e.movementX, e.movementY)).divide(180.0).multiply(1.2));
            document.body.style.cursor = "move";
        } else if (isTouchEvent(e)) {
            e.preventDefault();

            const touch = (e as TouchEvent).touches[0];

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

    onMouseUp = (e:MouseEvent|Event) => {
        this.isDragging = false;
        document.body.style.cursor = "unset";

        if (isTouchEvent(e)) {
            this.lastTouchPosition = null;
        }

    }

    canvasManagerChangesOffset = 0;

    private async animationFrame() {

        if (this.shirt == null) {
            console.warn("Tried to animate but shirt is null");
            return;
        }

        if (this.shirt.mesh == undefined) {
            throw new Error("Tried to animate but shirt mesh is undefined");
        }
        


        // console.log(Math.round(Math.sin(this.shirt.rotation.y) * 100) / 100) ;

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

        this.shirt.container.rotation.x += (this.shirtTargetRotation.y - this.shirt.container.rotation.x) * 0.18;
        this.shirt.container.rotation.y += (this.shirtTargetRotation.x - this.shirt.container.rotation.y) * 0.18;
        
        this.cameraFovTarget = Math.max(50, Math.min(78, this.cameraFovTarget));
        
        const cameraNewFov = this.camera.fov + (this.cameraFovTarget - this.camera.fov) * 0.18;
        const shirtMaterial = this.shirt.material;
        
        if (cameraNewFov !== this.camera.fov) {
            this.camera.fov = cameraNewFov;
            this.camera.updateProjectionMatrix();
        }

        if (this.waitingForTextureLoad) {
            if (!shirtMaterial.needsUpdate) {
                this.setMode("none");
                this.waitingForTextureLoad = false;
            }
        }
        
        const currentProgress = Math.max(0.01, this.progressBarForeground.offsetWidth) / this.progressBar.offsetWidth;
        this.progressBarForeground.style.width = `${(currentProgress + (this.progressBarTargetValue - currentProgress) * 0.18) * 100}%`;
    }

    async runAnimation() {
        await this.animationFrame();
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.runAnimation.bind(this));
    }

    async setStyle(
        newStyle:ShirtStyle, 
        loadingMode = false, 
        updateCanvas = true
    ) {

        if (this.shirt == null) {
            console.warn("Tried to set style but shirt model is null");
            return;
        }
        
        if (loadingMode) {
            // this.setMode('spinner');
        }

        this.scene.background = newStyle.backgroundColor;

        if (this.canvasManager instanceof CanvasManager && updateCanvas) {
            this.canvasManager.styleTextureUrl = newStyle.texturePath;
        }
    }

    pushShirtModel(modelUrl:string) {
        const loader = new GLTFLoader();

        this.setMode('progressBar');
        this.progressBarTargetValue = 0;

        loader.load(
            modelUrl,

            (data) => {
                const {scene:object} = data;

                console.log("GLB object:", object);
                

                this.scene.add(object);

                const style = ShirtStyle.styles[0];

                this.canvasManager = new CanvasManager(
                    this.container.parentElement,
                    (texture)=>{
                        this.shirt!.material.map = texture;
                        this.shirt!.material.needsUpdate = true;
                    },
                    style.texturePath,
                    '',
                    Vector.both(.5),
                    forwardsLimits
                );

                this.shirt = new ShirtModel(object);
                this.shirt.material.side = THREE.DoubleSide;

                window.shirt = this.shirt;
                window.shirtObject = object;

                this.shirtTargetRotation.x = this.shirt.container.rotation.y;
                this.shirtTargetRotation.y = this.shirt.container.rotation.x;

                object.scale.x = 0.04;
                object.scale.y = 0.04;
                object.scale.z = 0.04;

                this.setStyle(ShirtStyle.styles[0]);
                this.setMode("none");
            },

            (xhr) => {
                this.shirtLoadingProgress?.(xhr.loaded / xhr.total);
                this.progressBarTargetValue = xhr.loaded / xhr.total;
            },

            (error) => {
                console.error('Ocurrió un error al cargar el modelo.', error);
            }
        );
    }

    constructor(
        parentElement:HTMLElement, 
        aspectRatio:number, 
        private shirtLoadingProgress?:(percentage:number)=>void, 
        private readonly minTargetRotation:Vector = new Vector(NaN, -0.38), 
        private readonly maxTargetRotation: Vector = new Vector(NaN, 1)
    ) {
        this.camera = new THREE.PerspectiveCamera(74, aspectRatio, 0.1, 500);
        this.camera.position.z = 1;
        
        parentElement.appendChild(this.container);

        this.start();
    }

    private start() {
        this.setUpRenderer();
        this.setUpListeners();
        this.setUpLighting();
        
        this.runAnimation();
        this.setUpElements();
        this.downloadAndDecompressOBJ();
    }

    private downloadAndDecompressOBJ() {

        return new Promise<void>((resolve, reject)=>{
            const xhr = new XMLHttpRequest();

            this.setMode('progressBar');

            xhr.open("GET", "/model/shirt-lowres-glb.zip");

            xhr.onprogress = ((e:ProgressEvent) => {
                const percent = e.loaded / e.total;
                if (isFinite(percent)) {
                    console.log("Downloading compressed shirt model", (percent * 100.0).toFixed(2).toString() + "%");
                    this.progressBarTargetValue = percent; 
                }
            }).bind(this);

            xhr.onload = async () => {
                if (xhr.status !== 200) {
                    console.error("Could not download the shirt model.");
                    reject();
                    return;
                }

                console.log("Compressed shirt model downloaded. Decompressing.");

                this.setMode("spinner");

                const files = await JSZip.loadAsync(xhr.response);
                const uncompressedModel = await Object.values(files.files)[0].
                    async('blob');

                const modelUrl = URL.createObjectURL(uncompressedModel);
                console.log("Model decompressed. URL: ", modelUrl);
                this.pushShirtModel(modelUrl);

                resolve();
            }
            
            xhr.onerror = reject;

            xhr.responseType = 'arraybuffer';
            xhr.send();
        });


        
    }

    private setUpRenderer() {
        const rendererSize = (new Vector(this.container.offsetWidth, this.container.offsetHeight)).multiply(1.3);
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
    }

    private setUpElements() {
        this.container.appendChild(this.renderer.domElement);
        
        this.container.appendChild(this.placeholderForeground);
        this.placeholderForeground.appendChild(this.placeholderSpinner);

        this.placeholderForeground.appendChild(this.progressBar);
        this.progressBar.appendChild(this.progressBarForeground);
    }

    private setUpLighting() {
        const lightsValues:[intensity:number, position:Vector][] = [
            [1, new Vector(-5, 0)],
            [5, new Vector(0, 5)],
            [3, new Vector(5, 0)]
        ] as const;

        for (const lightValues of lightsValues) {
            const [brightness, position] = lightValues;

            const light = new THREE.DirectionalLight(this.COLORS.blank, brightness);
            light.position.set(position.x, position.y, 0).normalize();
            this.scene.add(light);
        }

        const light = new THREE.DirectionalLight(this.COLORS.blank, 2);
        light.position
            .set(0, 0, 5)
            .normalize();
        this.scene.add(light);
    }

    private setUpListeners() {
        this.renderer.domElement.addEventListener("mousedown", () => this.isDragging = true);
        this.renderer.domElement.addEventListener("touchdown", () => this.isDragging = true);

        this.renderer.domElement.addEventListener("mouseup", this.onMouseUp);
        this.renderer.domElement.addEventListener("touchup", this.onMouseUp);
        this.renderer.domElement.addEventListener("touchcancel", this.onMouseUp);
        this.renderer.domElement.addEventListener("touchend", this.onMouseUp);
        window.addEventListener("mouseout", this.onMouseUp);

        this.renderer.domElement.addEventListener("mousemove", this.onMouseMove);
        this.renderer.domElement.addEventListener("touchmove", this.onMouseMove);
    }
}