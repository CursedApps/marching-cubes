var calculateNoiseAtIdx = function(cameraPosition, i, j, k) {
    let x = roundTo(cameraPosition.x) + SCALE * (i - RANGE_NOISE[0] / 2);
    let y = roundTo(cameraPosition.y) + SCALE * (j - RANGE_NOISE[1] / 2);
    let z = roundTo(cameraPosition.z) + SCALE * (k - RANGE_NOISE[2] / 2);

    pos = new BABYLON.Vector3(x, y, z);
    value = (noise.simplex3(x, y, z) + 1) / 2;

    return {"position": pos, "value": value, "mesh": undefined};
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