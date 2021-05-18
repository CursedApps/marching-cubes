var canvas
var engine
var camera
var scene
var shadowGenerator
var isPointerLocked = false;
var worldNoise = [];

RANGE_NOISE = [40, 40, 40]; // x, y, z
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

        setupScene(); //Call the createScene function
        // assetsManager = new BABYLON.AssetsManager(scene);

        scene.onPointerDown = function () {
            //true/false check if we're locked, faster than checking pointerlock on each single click.
            if (!isPointerLocked) {
                canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
                if (canvas.requestPointerLock) {
                    canvas.requestPointerLock();
                }
            }
        };

        // Register a render loop to repeatedly render the scene
        engine.runRenderLoop(function () {
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

var setupNoise = function () {
    noise.seed(Math.random());

    for(let i = 0; i < RANGE_NOISE[0]; i++) {
        worldNoise.push([])
        for(let j = 0; j < RANGE_NOISE[2]; j++){
            worldNoise[i].push([])
            for(let k = 0; k < RANGE_NOISE[2]; k++) {
                let x = camera.position.x + i - RANGE_NOISE[0] / 2
                let y = camera.position.x + j - RANGE_NOISE[1] / 2
                let z = camera.position.x + k - RANGE_NOISE[2] / 2

                worldNoise[i][j].push(noise.simplex3(x, y, z))
            }
        }
    }


}

var setupCamera = function () {

        camera = new BABYLON.UniversalCamera("Camera", new BABYLON.Vector3(-10, 0, 0), scene);
        camera.target = new BABYLON.Vector3(0, 0, 0)

        camera.lowerBetaLimit = 0.1;
        camera.upperBetaLimit = (Math.PI / 2) * 0.9;

        camera.checkCollisions = true;
        camera.collisionRadius = new BABYLON.Vector3(1, 1, 1);
        // eventually : camera.ellipsoid

        // FORWARD: W, fleche haut = 87, 38
        // BACKWARDS: S, fleche bas = 83, 40
        // LEFT: A, fleche left = 65, 37
        // RIGHT: D, fleche droite = 68, 39

        camera._keys = [];
        camera.keysUp = [38, 87]; // forwards
        camera.keysDown = [40, 83]; // backwards

        camera.keysLeft = [37, 65]; // go left
        camera.keysRight = [39, 68];
        camera.speed = 0.25
        camera.angularSensibility = 6000.0 // higher is less sensible, default is 2000.0

        camera.attachControl(canvas, true);
}