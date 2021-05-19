var getMinMaxSpliceIndex = function(range, oldPos, newPos) {
    minPos = newPos - range / 2
    maxPos = newPos + range / 2

    prevMinBound = oldPos - range / 2

    minIdx = (minPos - prevMinBound)
    maxIdx = (maxPos - prevMinBound)

    return [Math.floor(minIdx), Math.ceil(maxIdx)]
}

var calculateNoiseAtIdx = function(cameraPosition, i, j, k) {
    let x = cameraPosition.x + i - RANGE_NOISE[0] / 2
    let y = cameraPosition.y + j - RANGE_NOISE[1] / 2
    let z = cameraPosition.z + k - RANGE_NOISE[2] / 2

    pos = new BABYLON.Vector3(x, y, z);
    value = ((noise.simplex3(x, y, z) + 1) / 2)

    return {"position": pos, "value": value}
}