var calculateNoiseAtIdx = function(cameraPosition, i, j, k) {
    let x = roundTo(cameraPosition.x) + SCALE * (i - RANGE_NOISE[0] / 2);
    let y = roundTo(cameraPosition.y) + SCALE * (j - RANGE_NOISE[1] / 2);
    let z = roundTo(cameraPosition.z) + SCALE * (k - RANGE_NOISE[2] / 2);

    pos = new BABYLON.Vector3(x, y, z);
    value = (noise.simplex3(x, y, z) + 1) / 2;

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


var randomNumber = function(min, max) { 
    return Math.random() * (max - min) + min;
} 

var getHeightAtPoint = function(x, z, yCamera, show = false) {

    var origin = new BABYLON.Vector3(x, yCamera + RANGE_NOISE[0]*5/2 - 1, z)
    var forward = new BABYLON.Vector3(0, -1, 0)

    var length = RANGE_NOISE[0] * 5

    var ray = new BABYLON.Ray(origin, forward, length)

    if(show) {
        let rayHelper = new BABYLON.RayHelper(ray);
        rayHelper.show(scene);
    }

    var hit = scene.pickWithRay(ray)

    return hit.distance
}

var isOOB = function(position, cameraPos) {
    minBoundX = cameraPos.x - RANGE_NOISE[0]*5/2
    maxBoundX = cameraPos.x + RANGE_NOISE[0]*5/2

    minBoundY = cameraPos.y - RANGE_NOISE[0]*5/2
    maxBoundY = cameraPos.y + RANGE_NOISE[0]*5/2

    minBoundZ = cameraPos.z - RANGE_NOISE[0]*5/2
    maxBoundZ = cameraPos.z + RANGE_NOISE[0]*5/2

    return minBoundX > position.x || position.x > maxBoundX || minBoundY > position.y || position.y > maxBoundY || minBoundZ > position.z || position.z > maxBoundZ

}