import { Vector } from "./classes/vector";
import { Shirt3DViewer, CanvasManager, ShirtStyle, backwardsLimits, forwardsLimits } from "./classes/viewer/viewer";

const shirtModelContainer = document.getElementById('shirt-model-container');
const shirtViewer = new Shirt3DViewer(shirtModelContainer!, 1);

const colorChangerContainer = document.getElementById('color-changer-container');

const hMovement = document.querySelector("#hmovement") as HTMLInputElement;
const vMovement = document.querySelector("#vmovement") as HTMLInputElement;
const rotation = document.querySelector("#rotation") as HTMLInputElement;
const scale = document.querySelector("#scale") as HTMLInputElement;

declare global {
    interface Window {
        setInput(id:string, value:string): void;
    }
}

window.setInput = (id, value) => {
    const element = document.getElementById(id);

    if (element instanceof HTMLInputElement) {
        element.value = value;
        element.dispatchEvent(new Event('change'));
    } else {
        console.error(`#${id} element is not HTMLInputElement.\n${element}`);
    }
}

export function setUpStylesButtons() {
    for(const style of ShirtStyle.styles) {
        const newChooser = document.createElement("div");
        
        newChooser.style.backgroundColor = style.representativeColor;
        newChooser.onclick = ()=>shirtViewer.setStyle(style, true);

        colorChangerContainer!.appendChild(newChooser);
    }
}

export function setUpSliders() {

    const events = ["input", "change"];

    events.forEach((eventName)=> {
        hMovement!.addEventListener(eventName, ()=> {
            if(shirtViewer.canvasManager instanceof CanvasManager) {
                shirtViewer.canvasManager.setImagePositionPercent(new Vector(parseFloat(hMovement!.value), shirtViewer.canvasManager.imagePositionPercent.y))
            }
        });

        vMovement.addEventListener(eventName, ()=> {
            if(shirtViewer.canvasManager instanceof CanvasManager) {
                shirtViewer.canvasManager.setImagePositionPercent(new Vector(shirtViewer.canvasManager.imagePositionPercent.x, parseFloat(vMovement.value)))
            }
        });

        rotation.addEventListener(eventName, ()=> {
            if(shirtViewer.canvasManager instanceof CanvasManager) {
                shirtViewer.canvasManager.setImageRotation(parseFloat(rotation.value));
            }
        });

        scale.addEventListener(eventName, () => {
            if(shirtViewer.canvasManager instanceof CanvasManager) {
                shirtViewer.canvasManager.scale = parseFloat(scale.value);
            }
        });
    });
}

export function setUpImageUpload() {
    const imageInput = document.querySelector("input#image-input") as HTMLInputElement;

    imageInput.addEventListener("input", async (e)=>{
        const file = ((imageInput.files??[])[0]);

        if (!file) {
            return;
        }

        const buffer = await file.arrayBuffer();

        const blob = new Blob([buffer], {type:file.type});
        const imageUrl = URL.createObjectURL(blob);

        const canvasManager = shirtViewer.canvasManager;

        if(canvasManager instanceof CanvasManager) {
            canvasManager.setImagePositionPercent(new Vector(parseFloat(hMovement.value), parseFloat(vMovement.value)));
            canvasManager.setImageRotation(parseFloat(rotation.value));
            canvasManager.scale = parseFloat(scale.value);
            canvasManager.stampTextureUrl = (imageUrl);
        }
    });
}

export function setUpSwitchOrientationButton() {
    const switchLimitsButton = document.querySelector("#switch-limits") as HTMLButtonElement;

    switchLimitsButton.onclick = () => {
        const canvasManager = shirtViewer.canvasManager;

        if(canvasManager instanceof CanvasManager) {
            canvasManager.imageLimit = (canvasManager.imageLimit == forwardsLimits) ? backwardsLimits : forwardsLimits;
            switchLimitsButton.textContent = (canvasManager.imageLimit !== forwardsLimits) ? "FRONT" : "BACK";
        };
    }   
}

export function setUpUI() {
    setUpStylesButtons();
    setUpSliders();
    setUpImageUpload();
    setUpSwitchOrientationButton();
}