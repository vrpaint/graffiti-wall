import { IObservableObject } from 'mobx';
import { IAppState, IDrawing } from './../../model/IAppState';
import { MaterialFactory } from './../MaterialFactory';
import * as BABYLON from 'babylonjs';
import { createScene } from './createScene';
import { createLights } from './createLights';
import { createGround } from './createGround';
import { createSkybox } from './createSkybox';
import * as uuidv4 from 'uuid/v4';
import { ISituationState } from '../../model/ISituationState';
import {
    babylonToCleanVector,
    cleanVectorToBabylon,
} from '../../tools/vectors';
import {
    drawOnWallAppStateDrawing,
    drawOnWallSituationStateControllers,
} from '../../tools/drawWallDrawing';
import { babylonMeshToFrame } from '../../tools/frame';

export default class World {
    public engine: BABYLON.Engine;
    public scene: BABYLON.Scene;
    public webVR: boolean;
    public lights: BABYLON.Light[];

    //todo maybe encapsulate meshes
    public groundMesh: BABYLON.AbstractMesh;
    public skyboxMesh: BABYLON.AbstractMesh;
    public wallMesh: null | BABYLON.AbstractMesh = null;
    //todo maybe encapsulate wall
    public wallMaterial: BABYLON.StandardMaterial;
    public wallTexture: BABYLON.DynamicTexture;

    public materialFactory: MaterialFactory;
    public VRHelper: BABYLON.VRExperienceHelper;

    constructor(
        public canvasElement: HTMLCanvasElement,
        public appState: IAppState & IObservableObject,
        public situationState: ISituationState & IObservableObject,
    ) {}

    run() {
        this.engine = new BABYLON.Engine(this.canvasElement, true, {
            //preserveDrawingBuffer: true,
        });

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        this.scene = createScene(this.engine);
        this.lights = createLights(this.scene);
        this.materialFactory = new MaterialFactory(this);
        this.groundMesh = createGround(this.scene, this.materialFactory);
        this.skyboxMesh = createSkybox(this.scene);

        //todo to separate file
        this.wallTexture = new BABYLON.DynamicTexture(
            'wallTexture',
            1024,
            this.scene,
            true,
        );
        const wallTextureContext = this.wallTexture.getContext();

        this.scene.registerBeforeRender(() => {
            if (this.appState.corners) {
                
                wallTextureContext.fillStyle = 'white';
                wallTextureContext.fillRect(0, 0, wallTextureContext.canvas.width, wallTextureContext.canvas.height);
                //wallTextureContext.clearRect(0, 0, wallTextureContext.canvas.width, wallTextureContext.canvas.height);
                drawOnWallAppStateDrawing(
                    this.appState.drawings,
                    this.appState.corners!,
                    wallTextureContext,
                );
                drawOnWallSituationStateControllers(
                    this.situationState.controllers,
                    this.appState.corners!,
                    wallTextureContext,
                );

                this.wallTexture.update();
            }
        });

        this.wallMaterial = new BABYLON.StandardMaterial(
            'wallMaterial',
            this.scene,
        );
        this.wallMaterial.ambientTexture = this.wallTexture;
        this.renderWallMesh();

        this.VRHelper = this.scene.createDefaultVRExperience();

        this.VRHelper.onControllerMeshLoadedObservable.add((controller) => {

            let controllerPressed = false;


            {
                const id = uuidv4();
                console.log(`Controller ${id} loaded.`, controller);
                //todo on unload
                this.situationState.controllers.push({
                    id,
                    currentFrame: {
                        position: { x: 0, y: 0, z: 0 },
                        rotation: null
                    }
                    
                });
                this.scene.registerAfterRender(() => {
                    const controllerState = this.situationState.controllers.find(
                        (controller) => controller.id == id,
                    )!;
                    controllerState.currentFrame = babylonMeshToFrame(controller.mesh!);
                });
            }

            {
                const id = uuidv4();
                const drawing: IDrawing = {
                    id,
                    frames: [],
                };
                this.appState.drawings.push(drawing);
                this.scene.registerAfterRender(() => {
                    if(controllerPressed){
                    const drawing = this.appState.drawings.find(
                        (drawing) => drawing.id == id,
                    )!;
                    drawing.frames.push(
                        babylonMeshToFrame(controller.mesh!)
                    );
                    }
                });
            }

            controller.onTriggerStateChangedObservable.add((gamepadButton) => {
                console.log('Trigger state changed.', gamepadButton);

                if (!this.appState.corners) {
                    //---------------------------------------In calibration process
                    if (gamepadButton.value === 1) {
                        this.appState.calibrationProgress.push(
                            babylonToCleanVector(controller.mesh!.position),
                        );

                        if (this.appState.calibrationProgress.length === 4) {
                            console.log(
                                'this.appState.calibrationProgress',
                                this.appState.calibrationProgress,
                            );

                            /*for (const cornerPosition of this.appState
                                .calibrationProgress) {
                                const cornerMesh = BABYLON.Mesh.CreateSphere(
                                    'skyBox',
                                    5,
                                    0.1,
                                    this.scene,
                                );
                                cornerMesh.position = cleanVectorToBabylon(
                                    cornerPosition,
                                );
                            }*/

                            const [
                                topLeft,
                                topRight,
                                bottomRight,
                                bottomLeft,
                            ] = this.appState.calibrationProgress;
                            this.appState.corners = {
                                topLeft,
                                topRight,
                                bottomLeft,
                                bottomRight,
                            };
                            this.appState.calibrationProgress = [];
                            this.renderWallMesh();
                        }
                    }

                    //---------------------------------------
                } else {
                    //---------------------------------------Drawing
                    if (gamepadButton.value === 1) {
                        controllerPressed = true;
                    }else{
                        controllerPressed = false;
                    }
                    //---------------------------------------
                }
            });
        });

        /*
        (this.VRHelper.currentVRCamera as BABYLON.WebVRFreeCamera).onControllersAttachedObservable.add((x)=>{
            console.log('onControllersAttachedObservable',x);
        });

        
        (this.VRHelper.currentVRCamera as BABYLON.WebVRFreeCamera).onControllerMeshLoadedObservable.add((x)=>{
            console.log('onControllerMeshLoadedObservable',x);
        });*/
    }

    //todo set controlls
    //todo create world

    renderWallMesh() {
        if (!this.appState.corners) {
            return; //todo maybe throw Error
        }

        if (this.wallMesh) {
            this.wallMesh.dispose();
        }

        const {
            topLeft,
            topRight,
            bottomLeft,
            bottomRight,
        } = this.appState.corners;
        const pathArray = [
            [cleanVectorToBabylon(topLeft), cleanVectorToBabylon(topRight)],
            [
                cleanVectorToBabylon(bottomLeft),
                cleanVectorToBabylon(bottomRight),
            ],
        ];
        this.wallMesh = BABYLON.MeshBuilder.CreateRibbon(
            'ribbon',
            { pathArray },
            this.scene,
        );
        this.wallMesh.material = this.wallMaterial;
        console.log('material',this.wallMaterial);
        console.log('texture',this.wallMaterial.ambientTexture);

    }

    dispose() {
        this.scene.dispose(); //todo is it all?
    }
}
