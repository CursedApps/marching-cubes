var calculateNoiseAtIdx = function(cameraPosition, i, j, k) {
    let x = Math.floor(cameraPosition.x + i - RANGE_NOISE[0] / 2);
    let y = Math.floor(cameraPosition.y + j - RANGE_NOISE[1] / 2);
    let z = Math.floor(cameraPosition.z + k - RANGE_NOISE[2] / 2);

    pos = new BABYLON.Vector3(x, y, z);
    value = ((noise.simplex3(x, y, z) + 1) / 2);

    return {"position": pos, "value": value};
}