var canvas;
var engine;
var camera;
var scene;
var shadowGenerator;
var isPointerLocked = false;
var noiseInfo = [];
var objs = [];
var oldCameraPosition = new BABYLON.Vector3(0, 0, 0);

RANGE_NOISE = [20, 20, 20]; // x, y, z
NOISE_TRESH = 0.5

// Resize the babylon engine when the window is resized
window.addEventListener("resize", function () {
        if (engine) {
                engine.resize();
        }
}, false);


window.onload = function () {
        canvas = document.getElementById("renderCanvas"); // Get the canvas element
        engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine
        i = 0
        setupScene(); //Call the createScene function

        scene.onPointerDown = function () {
            //true/false check if we're locked, faster than checking pointerlock on each single click.
            if (!isPointerLocked) {
                canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
                if (canvas.requestPointerLock) {
                    canvas.requestPointerLock();
                }
            }
        };

        engine.runRenderLoop(function () {
            if(camera && (Math.abs(camera.position.x - oldCameraPosition.x) >= 0.1|| Math.abs(camera.position.y - oldCameraPosition.y) >= 0.1|| Math.abs(camera.position.z - oldCameraPosition.z) >= 0.1)) {
                updateNoise(oldCameraPosition, camera.position);
                visualiseNoise();
                oldCameraPosition = new BABYLON.Vector3(camera.position.x, camera.position.y, camera.position.z);
            }
        
            scene.render();
        });

        // Watch for browser/canvas resize events
        window.addEventListener("resize", function () {
                engine.resize();
        });
}

var setupScene = function () {

        // Create the scene space
        scene = new BABYLON.Scene(engine);

        // Add a camera to the scene and attach it to the canvas
        setupCamera();
        setupNoise();
        visualiseNoise();
        computeCubeMeshes();

        // Add lights to the scene
        var hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
        hemi.intensity = 0.6;
        hemi.diffuse = new BABYLON.Color3(1, 0.78, 0.51);
        hemi.specular = new BABYLON.Color3(1, 0.89, 0.65);
        hemi.groundColor = new BABYLON.Color3(0.94, 0.6, 0.43);

        var dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-1, -1, 1), scene);
        dir.position = new BABYLON.Vector3(500, 250, -500);
        dir.intensity = 0.6

        shadowGenerator = new BABYLON.ShadowGenerator(4096, dir);
        shadowGenerator.normalBias = 0.02;
        shadowGenerator.usePercentageCloserFiltering = true;

        scene.shadowsEnabled = true;

        BABYLON.SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "box.babylon");

}

var setupCamera = function () {
    camera = new BABYLON.UniversalCamera("Camera", new BABYLON.Vector3(-10, 0, 0), scene);
    camera.target = new BABYLON.Vector3(0, 0, 0)
    camera.maxZ = 500

    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = (Math.PI / 2) * 0.9;

    camera.checkCollisions = true;
    camera.collisionRadius = new BABYLON.Vector3(1, 1, 1);
    // eventually : camera.ellipsoid

    camera._keys = [];
    camera.keysUp = [38, 87]; // fleche haut, W
    camera.keysDown = [40, 83]; // fleche bas, S

    camera.keysLeft = [37, 65]; // fleche left, A
    camera.keysRight = [39, 68]; // fleche right, D

    camera.keysUpward = [32]; // space
    camera.keysDownward = [16]; // shift

    camera.speed = 0.1;
    camera.angularSensibility = 6000.0; // higher is less sensible, default is 2000.0

    camera.attachControl(canvas, true);
}

var setupNoise = function () {
    noise.seed(Math.random());
    var segments = 32
    var diameter = 0.1

    for(let i = 0; i < RANGE_NOISE[0]; i++) {
        noiseInfo.push([]);
        objs.push([]);

        for(let j = 0; j < RANGE_NOISE[1]; j++) {
            noiseInfo[i].push([]);
            objs[i].push([]);

            for(let k = 0; k < RANGE_NOISE[2]; k++) {
                noiseInfo[i][j].push(calculateNoiseAtIdx(camera.position, i, j, k));

                var sphere = BABYLON.Mesh.CreateSphere("sphere", segments, diameter, scene);
                var material = new BABYLON.StandardMaterial(scene);
                material.diffuseColor = new BABYLON.Color3(0, 0, 0);
                sphere.material = material;
                objs[i][j].push(sphere);
            }
        }
    }
}

var updateNoise = function (oldPos, newPos) {
    let oldNoiseInfo = noiseInfo
    depl = newPos - oldPos;

    for(let i = 0; i < RANGE_NOISE[0]; i++) {
        for(let j = 0; j < RANGE_NOISE[1]; j++){
            for(let k = 0; k < RANGE_NOISE[2]; k++) {
                idx = new BABYLON.Vector3(i,j,k);
                delta = i + depl;
                if (0 <= delta.x && delta.x < RANGE_NOISE[0] && 0 <= delta.y && delta.y < RANGE_NOISE[1] && 0 <= delta.z && delta.z < RANGE_NOISE[2])
                    noiseInfo[i][j][k] = oldNoiseInfo[delta.x][delta.y][delta.z];
                else 
                    noiseInfo[i][j][k] = calculateNoiseAtIdx(camera.position, i, j, k);
            }
        }
    }
}

var visualiseNoise = function () {
    for(let i = 0; i < RANGE_NOISE[0]; i++) {
        for(let j = 0; j < RANGE_NOISE[1]; j++){
            for(let k = 0; k < RANGE_NOISE[2]; k++) {
                // objs[i][j][k].isVisible = noiseInfo[i][j][k].value >= NOISE_TRESH;
                objs[i][j][k].position = noiseInfo[i][j][k].position;
                objs[i][j][k].material.diffuseColor = new BABYLON.Color3(noiseInfo[i][j][k].value, noiseInfo[i][j][k].value, noiseInfo[i][j][k].value);
            }
        }
    }
}

var computeCubeMeshes = function () {

}