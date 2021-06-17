var calculateNoiseAtIdx = function(cameraPosition, i, j, k) {

    let x = roundTo(cameraPosition.x) + SCALE * (i - RANGE_NOISE[0] / 2);
    let y = roundTo(cameraPosition.y) + SCALE * (j - RANGE_NOISE[1] / 2);
    let z = roundTo(cameraPosition.z) + SCALE * (k - RANGE_NOISE[2] / 2);

    pos = new BABYLON.Vector3(x, y, z);
    if ((-SCALE/2 < x && x < SCALE/2) && (-SCALE/2 < y && y < SCALE/2) && (-SCALE/2 < z && z < SCALE/2)) {
        value = 0
    } else {
        value = (noise.simplex3(x, y, z) + 1) / 2;
    }

    return {"position": pos, "value": value, "mesh": null};
}

var isOn = function(noiseInfo) {
    return +(noiseInfo >= NOISE_TRESH)
}

var getCubeIdx = function(i, j, k, noiseInfo) {
    number = 0;

    for(let v = 0; v < 8; v++) {
        _i = (v & 0b1) ^ ((v & 0b10) >>> 1)
        _j = (v & 0b100) >>> 2
        _k = (v & 0b10) >>> 1

        noiseInfoValue = noiseInfo[i + _i][j + _j][k + _k].value
        pad = (isOn(noiseInfoValue) << v)
        number |= pad
    }
    return number
}

var roundTo = function(value) {
    return Math.ceil(value/SCALE)*SCALE
}

var updateFogColor = function(cameraPosition) {
    
    if (cameraPosition.y >= 0) {
        // in the shallow
        perc = Math.min(cameraPosition.y/100, 1)
        fogColor = new BABYLON.Color3(0.45, 0.6 + 0.4 * perc, 1 - 0.12 * perc)
    } else {
        perc = Math.max(cameraPosition.y/100, -1)
        fogColor = new BABYLON.Color3(0.45 + 0.38 * perc, 0.6 + 0.6 * perc, 1 + 0.86 * perc)
    }
    return fogColor
}

var rand = function(min, max) { 
    return Math.random() * (max - min) + min;
} 

var getHeightAtPoint = function(x, z, yCamera, show = false) {

    var origin = new BABYLON.Vector3(x, yCamera + (RANGE_NOISE[0]*5/2) - 1, z)
    var forward = new BABYLON.Vector3(0, -1, 0)

    var length = RANGE_NOISE[0] * 5

    var ray = new BABYLON.Ray(origin, forward, length)

    if(show) {
        let rayHelper = new BABYLON.RayHelper(ray);
        rayHelper.show(scene);
    }

    var hit = scene.pickWithRay(ray)

    return hit
}

var isInBounds = function(position, cameraPos) {
    minBoundX = cameraPos.x - RANGE_NOISE[0]*5/2
    maxBoundX = cameraPos.x + RANGE_NOISE[0]*5/2

    minBoundY = cameraPos.y - RANGE_NOISE[0]*5/2
    maxBoundY = cameraPos.y + RANGE_NOISE[0]*5/2

    minBoundZ = cameraPos.z - RANGE_NOISE[0]*5/2
    maxBoundZ = cameraPos.z + RANGE_NOISE[0]*5/2

    return (minBoundX < position.x && position.x < maxBoundX) && (minBoundY < position.y && position.y < maxBoundY) && (minBoundZ < position.z && position.z < maxBoundZ)

}

var requestPointerLock = function(canvas) {
    return canvas.requestPointerLock ||
            canvas.msRequestPointerLock ||
            canvas.mozRequestPointerLock ||
            canvas.webkitRequestPointerLock;
}

var hasCameraMoved = function(camera) {
    return camera &&
    (
        Math.abs(camera.position.x - oldCameraPosition.x) >= SCALE / 3 ||
        Math.abs(camera.position.y - oldCameraPosition.y) >= SCALE / 3 ||
        Math.abs(camera.position.z - oldCameraPosition.z) >= SCALE / 3
    )
}

var onProcessFileCallback = function (file, name, extension) {
    if (filesInput._filesToLoad && filesInput._filesToLoad.length === 1 && extension) {
        BABYLON.Tools.ReadFile(file, function (dataText) {
            let simBtn = document.getElementById("simBtn");
            simBtn.disabled = false;
            var data = JSON.parse(dataText);
            setupSimulation(data);
        });
    }
    return false;
}

var generatePlantPosition = function(camera) {
    let x, y, z = 0;
    do {
        x = rand(camera.position.x - RANGE_NOISE[0] * 5/2, camera.position.x + RANGE_NOISE[0] * 5/2);
        z = rand(camera.position.z - RANGE_NOISE[0] * 5/2, camera.position.z + RANGE_NOISE[0] * 5/2);

        hit = getHeightAtPoint(x, z, camera.position.y);
    } while (hit.pickedMesh && hit.pickedMesh.name != "ground");
    
    y = camera.position.y + (RANGE_NOISE[0] * 5/2) - 1 - hit.distance

    return [new BABYLON.Vector3(x, y, z), hit.getNormal()]
}