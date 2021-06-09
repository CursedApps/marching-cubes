var canvas;
var engine;
var camera;
var scene;
var shadowGenerator;
var isPointerLocked = false;
var noiseInfo = [];
var objs = [];
var oldCameraPosition = new BABYLON.Vector3(0, 0, 0);
var baseMeshes = [];
var box;
var point;
var spot;
var assetsManager;
var isSimulationRunning = false;

var poissonsMeshes = {};
var plantsMeshes = {};

var activeFish = [];
var activePlants = [];

const RANGE_NOISE = [10, 10, 10]; // x, y, z
const NOISE_TRESH = 0.4;
const COLOR_SHALLOW = new BABYLON.Color3(0.45, 1, 0.88);
const COLOR_START = new BABYLON.Color3(0.45, 0.6, 1);
const COLOR_DEEP = new BABYLON.Color3(0.07, 0, 0.14);
const MIN_DEPTH = -100;
const MAX_DEPTH = 100;
// Resize the babylon engine when the window is resized
window.addEventListener(
  "resize",
  function () {
    if (engine) {
      engine.resize();
    }
  },
  false
);

window.onload = function () {
  canvas = document.getElementById("renderCanvas"); // Get the canvas element
  engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

  var targetNode = document.getElementById("splashscreen");
  var observer = new MutationObserver(function () {
    if (targetNode.style.display == "none") {
      addUI();
    }
  });

  observer.observe(targetNode, { attributes: true, childList: true });

  setupScene();
  assetsManager = new BABYLON.AssetsManager(scene);
  loadEnvMeshes();

  scene.onPointerDown = function () {
    //true/false check if we're locked, faster than checking pointerlock on each single click.
    if (!isPointerLocked) {
      canvas.requestPointerLock =
        canvas.requestPointerLock ||
        canvas.msRequestPointerLock ||
        canvas.mozRequestPointerLock ||
        canvas.webkitRequestPointerLock;
      if (canvas.requestPointerLock) {
        canvas.requestPointerLock();
      }
    }
  };

  scene.registerBeforeRender(function () {
    if(isSimulationRunning) {
        updateSimulation()
    }
})
    

  engine.runRenderLoop(function () {
    if (
      camera &&
      (Math.abs(camera.position.x - oldCameraPosition.x) >= SCALE / 3 ||
        Math.abs(camera.position.y - oldCameraPosition.y) >= SCALE / 3 ||
        Math.abs(camera.position.z - oldCameraPosition.z) >= SCALE / 3)
    ) {
      updateNoise(oldCameraPosition, camera.position);
      oldCameraPosition = new BABYLON.Vector3(camera.position.x, camera.position.y, camera.position.z);
    }
    box.position = camera.position;
    point.position = camera.position;
    scene.fogColor = updateFogColor(camera.position);
    scene.render();
  });

  // Watch for browser/canvas resize events
  window.addEventListener("resize", function () {
    engine.resize();
  });
};

var addUI = function () {
  let input = document.getElementById("input");

  if (!input) {
    input = document.createElement("input");
    input.type = "file";
    input.style.position = "absolute";
    input.style.right = "20px";
    input.style.top = "60px";
    input.style.zIndex = "2";
    input.accept = ".json,.png";
    document.body.appendChild(input);
  }

  // Files input
  var filesInput = new BABYLON.FilesInput(
    engine,
    null,
    null,
    null,
    null,
    null,
    function () {
      BABYLON.Tools.ClearLogCache();
    },
    function () {},
    null
  );
  filesInput.onProcessFileCallback = function (file, name, extension) {
    if (filesInput._filesToLoad && filesInput._filesToLoad.length === 1 && extension) {
      BABYLON.Tools.ReadFile(file, function (dataText) {
        let simBtn = document.getElementById("simBtn");
        simBtn.disabled = false;
        var data = JSON.parse(dataText);
        setupSimulation(data);
      });
    }
    return false;
  }.bind(this);

  input.addEventListener(
    "click",
    function (event) {
      event.target.files = null;
      event.target.value = null;
      filesToLoad = null;
    },
    false
  );

  input.addEventListener(
    "change",
    function (event) {
      let simBtn = document.getElementById("simBtn");
      simBtn.disabled = true;
      clearSimulation();
      var filestoLoad;
      // Handling files from input files
      if (event && event.target && event.target.files) {
        filesToLoad = event.target.files;
      }
      filesInput.loadFiles(event);
    },
    false
  );

  let simBtn = document.getElementById("simBtn");
  if (!simBtn) {
    simBtn = document.createElement("button");
    simBtn.id = "simBtn";
    simBtn.type = "button";
    simBtn.textContent = "Populate!";
    simBtn.style.zIndex = "2";
    simBtn.disabled = true;
    document.body.appendChild(simBtn);
    simBtn.style.right = `${5 + input.getBoundingClientRect().width - simBtn.getBoundingClientRect().width}px`;
    simBtn.style.top = `${simBtn.getBoundingClientRect().top + 20}px`;
  }

  simBtn.addEventListener("click", function () {
    isSimulationRunning = true;
  });
};

var setupScene = function () {
  // Create the scene space
  scene = new BABYLON.Scene(engine);
  scene.useGeometryIdsMap = true;

  scene.executeWhenReady(function () {
    // Remove loader
    var loader = document.querySelector("#splashscreen");
    loader.style.display = "none";
  });

  // Add a camera to the scene and attach it to the canvas
  baseMeshes = preComputeCubeMeshes(scene);
  setupCamera();
  setupSkybox();
  setupNoise();

  // Add lights to the scene
  // var hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
  // hemi.intensity = 0
  // hemi.diffuse = new BABYLON.Color3(0.47, 0, 0.70); // bleu
  // hemi.specular = new BABYLON.Color3(0.1, 0.041, 0.071);
  // hemi.groundColor = new BABYLON.Color3(0, 0.33, 1);

  // var dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-1, -1, 1), scene);
  // dir.position = new BABYLON.Vector3(500, 250, -500);
  // dir.intensity = 0

  point = new BABYLON.PointLight("sub", new BABYLON.Vector3(0, 0, -10), scene);
  point.intensity = 5;
  point.diffuse = new BABYLON.Color3(0.55, 0.86, 1); // bleu
  point.specular = new BABYLON.Color3(0.1, 0.041, 0.071);

  // spot = new BABYLON.SpotLight("spot", new BABYLON.Vector3(0,0,-10), new BABYLON.Vector3(0,0,0), 0.5, 3, scene)
  // spot.falloffType = BABYLON.FALLOFF_PHYSICAL

  // shadowGenerator = new BABYLON.ShadowGenerator(4096, dir);
  // shadowGenerator.normalBias = 0.02;
  // shadowGenerator.usePercentageCloserFiltering = true;

  // scene.shadowsEnabled = true;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
  scene.fogDensity = 0.09;
  scene.fogStart = 10.0;
  scene.fogEnd = 15.0;
  scene.fogColor = new BABYLON.Color3(0.45, 0.94, 1);
};

var setupSkybox = function () {
  let boxSize = SCALE * RANGE_NOISE[0];
  box = BABYLON.MeshBuilder.CreateBox("box", { size: RANGE_NOISE[0] * 5 }, scene);
  let material = new BABYLON.StandardMaterial(scene);
  material.backFaceCulling = false;
  box.material = material;

  const particleSystem = new BABYLON.ParticleSystem("particles", 2000);
  particleSystem.particleTexture = new BABYLON.Texture("./assets/textures_flare.png");
  particleSystem.emitter = box;
  particleSystem.minEmitBox = new BABYLON.Vector3(-boxSize / 2, -boxSize / 2, -boxSize / 2); // Starting all from
  particleSystem.maxEmitBox = new BABYLON.Vector3(boxSize / 2, boxSize / 2, boxSize / 2); // To...

  particleSystem.color1 = new BABYLON.Color4(1, 0.83, 0.98, 0.5);
  particleSystem.color2 = new BABYLON.Color4(0.7, 0.38, 0.86, 0.5);
  particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);

  particleSystem.minSize = 0.1;
  particleSystem.maxSize = 0.5;

  particleSystem.minLifeTime = 0.3;
  particleSystem.maxLifeTime = 1.5;

  particleSystem.emitRate = 1250;

  particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;

  var noiseTexture = new BABYLON.NoiseProceduralTexture("perlin", 256, scene);
  noiseTexture.animationSpeedFactor = 10;
  noiseTexture.persistence = 2;
  noiseTexture.brightness = 0.5;
  noiseTexture.octaves = 2;

  particleSystem.noiseTexture = noiseTexture;
  particleSystem.noiseStrength = new BABYLON.Vector3(100, 100, 100);

  particleSystem.start();
};

var setupCamera = function () {
  camera = new BABYLON.UniversalCamera("Camera", new BABYLON.Vector3(0, 0, -10), scene);
  camera.target = new BABYLON.Vector3(0, 0, 0);
  camera.maxZ = 500;

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
};

var setupNoise = function () {
  noise.seed(Math.random());

  for (let i = 0; i < RANGE_NOISE[0]; i++) {
    noiseInfo.push([]);
    for (let j = 0; j < RANGE_NOISE[1]; j++) {
      noiseInfo[i].push([]);
      for (let k = 0; k < RANGE_NOISE[2]; k++) {
        noiseInfo[i][j].push(calculateNoiseAtIdx(camera.position, i, j, k));
      }
    }
  }
};

var updateNoise = function (oldPos, newPos) {
  let oldNoiseInfo = noiseInfo;
  let oldPosV = new BABYLON.Vector3(oldPos.x, oldPos.y, oldPos.z);
  let newPosV = new BABYLON.Vector3(newPos.x, newPos.y, newPos.z);
  let depl = newPosV.subtract(oldPosV).floor();

  scene.blockfreeActiveMeshesAndRenderingGroups = true;
  for (let i = 0; i < RANGE_NOISE[0]; i++) {
    for (let j = 0; j < RANGE_NOISE[1]; j++) {
      for (let k = 0; k < RANGE_NOISE[2]; k++) {
        idx = new BABYLON.Vector3(i, j, k);
        delta = idx + depl;

        if (oldNoiseInfo[i][j][k].mesh) {
          oldNoiseInfo[i][j][k].mesh.dispose();
        }

        if (
          0 <= delta.x &&
          delta.x < RANGE_NOISE[0] &&
          0 <= delta.y &&
          delta.y < RANGE_NOISE[1] &&
          0 <= delta.z &&
          delta.z < RANGE_NOISE[2]
        )
          noiseInfo[i][j][k] = oldNoiseInfo[delta.x][delta.y][delta.z];
        else {
          noiseInfo[i][j][k] = calculateNoiseAtIdx(camera.position, i, j, k);
        }
      }
    }
  }
  scene.blockfreeActiveMeshesAndRenderingGroups = false;

  for (let i = 0; i < RANGE_NOISE[0] - 1; i++) {
    for (let j = 0; j < RANGE_NOISE[1] - 1; j++) {
      for (let k = 0; k < RANGE_NOISE[2] - 1; k++) {
        if (noiseInfo[i][j][k].mesh) {
          break;
        }

        let vIdx = getCubeIdx(i, j, k, noiseInfo);

        let newMesh = baseMeshes[vIdx].createInstance("mesh");
        newMesh.position = new BABYLON.Vector3(
          noiseInfo[i][j][k].position.x + SCALE / 2,
          noiseInfo[i][j][k].position.y + SCALE / 2,
          noiseInfo[i][j][k].position.z + SCALE / 2
        );
        noiseInfo[i][j][k].mesh = newMesh;
      }
    }
  }
};

var loadFish = function (newMeshes, key) {
  var parent = new BABYLON.Mesh("dummy", scene);
  let meshes = newMeshes.meshes;
  for (let mesh of meshes) {
    mesh.rotation.y = Math.PI / 2;
    parent.addChild(mesh);
    mesh.isVisible = false;
  }
  poissonsMeshes[key] = parent;
};

var loadPlant = function (newMeshes, key) {
  var parent = new BABYLON.Mesh("dummy", scene);
  let meshes = newMeshes.meshes;

  for (let mesh of meshes) {
    parent.addChild(mesh);
    mesh.isVisible = false;
  }
  plantsMeshes[key] = parent;
};

var loadEnvMeshes = function () {
  Promise.all([
    BABYLON.SceneLoader.ImportMeshAsync("", meshLUT.POISSONS[0].path, meshLUT.POISSONS[0].scene, scene).then(
      (newMeshes) => loadFish(newMeshes, meshLUT.POISSONS[0].key)
    ),
    BABYLON.SceneLoader.ImportMeshAsync("", meshLUT.POISSONS[1].path, meshLUT.POISSONS[1].scene, scene).then(
      (newMeshes) => loadFish(newMeshes, meshLUT.POISSONS[1].key)
    ),
    BABYLON.SceneLoader.ImportMeshAsync("", meshLUT.POISSONS[2].path, meshLUT.POISSONS[2].scene, scene).then(
      (newMeshes) => loadFish(newMeshes, meshLUT.POISSONS[2].key)
    ),
    BABYLON.SceneLoader.ImportMeshAsync("", meshLUT.POISSONS[3].path, meshLUT.POISSONS[3].scene, scene).then(
      (newMeshes) => loadFish(newMeshes, meshLUT.POISSONS[3].key)
    ),
    BABYLON.SceneLoader.ImportMeshAsync("", meshLUT.POISSONS[4].path, meshLUT.POISSONS[4].scene, scene).then(
      (newMeshes) => loadFish(newMeshes, meshLUT.POISSONS[4].key)
    ),
  ]).then(() => {});

  Promise.all([
    BABYLON.SceneLoader.ImportMeshAsync("", meshLUT.PLANTES[0].path, meshLUT.PLANTES[0].scene, scene).then(
      (newMeshes) => loadPlant(newMeshes, meshLUT.PLANTES[0].key)
    ),
    BABYLON.SceneLoader.ImportMeshAsync("", meshLUT.PLANTES[1].path, meshLUT.PLANTES[1].scene, scene).then(
      (newMeshes) => loadPlant(newMeshes, meshLUT.PLANTES[1].key)
    ),
    BABYLON.SceneLoader.ImportMeshAsync("", meshLUT.PLANTES[2].path, meshLUT.PLANTES[2].scene, scene).then(
      (newMeshes) => loadPlant(newMeshes, meshLUT.PLANTES[2].key)
    ),
  ]).then(() => {});
};

var clearSimulation = function () {
  for (let f of activeFish) {
    f.mesh.dispose();
  }

  activeFish = [];

  for (let p of activePlants) {
    p.mesh.dispose();
  }

  activePlants = [];
};

var setupSimulation = function (data) {
  let simulation = data.aquarium;

  let simPoissons = simulation.poissons;
  let simPlantes = simulation.plantes;

  for (let p of simPlantes) {
    cpt = 0;
    while (cpt < 200) {
        cpt++
        let pMesh = plantsMeshes[p.nom].clone("plant");
        pMesh.setEnabled(true);
        for (let c of pMesh._children) {
            c.isVisible = true;
        }
        pMesh.scaling.x = p.transformation[0][0];
        pMesh.scaling.y = p.transformation[1][1];
        pMesh.scaling.z = p.transformation[2][2];
        pMesh.computeWorldMatrix();

        let x, y, z = 0;

        do {
            x = randomNumber(camera.position.x - RANGE_NOISE[0] * 5/2, camera.position.x + RANGE_NOISE[0] * 5/2);
            z = randomNumber(camera.position.z - RANGE_NOISE[0] * 5/2, camera.position.z + RANGE_NOISE[0] * 5/2);

            hitDist = getHeightAtPoint(x, z, camera.position.y);
            y = camera.position.y + (RANGE_NOISE[0] * 5/2) - 1 - hitDist
        } while (y <= camera.position.y - (RANGE_NOISE[0] * 5/2));

        pMesh.position = new BABYLON.Vector3(x, y, z);

        activePlants.push({
          mesh: pMesh,
          min: p.profondeurMin,
          max: p.profondeurMax
        });
    }
}

  for (let p of simPoissons) {
    cpt = 0;
    while (cpt < 100) {
      cpt++;
      let pMesh = poissonsMeshes[p.nom].clone("fish");
      pMesh.setEnabled(true);
      for (let c of pMesh._children) {
        c.isVisible = true;
      }
      pMesh.scaling.x = p.transformation[0][0];
      pMesh.scaling.y = p.transformation[1][1];
      pMesh.scaling.z = p.transformation[2][2];
      pMesh.computeWorldMatrix();

      let _x = randomNumber(camera.position.x - RANGE_NOISE[0] * 5/2, camera.position.x + RANGE_NOISE[0] * 5/2)
      let _y = randomNumber(camera.position.y - RANGE_NOISE[0] * 5/2, camera.position.y + RANGE_NOISE[0] * 5/2)
      let _z = randomNumber(camera.position.z - RANGE_NOISE[0] * 5/2, camera.position.z + RANGE_NOISE[0] * 5/2)

      pMesh.position = new BABYLON.Vector3(_x, _y, _z);
      activeFish.push({
        mesh: pMesh,
        speed: p.vitesse,
        min: p.profondeurMin,
        max: p.profondeurMax
      });
    }
  }
};


var updateSimulation = function(dt) {
    // move assets that are out of bounds
    for(let p of activePlants) {
        if(isOOB(p.mesh.position, camera.position)){
            let x, y, z = 0;
            do {
                x = randomNumber(camera.position.x - RANGE_NOISE[0] * 5/2, camera.position.x + RANGE_NOISE[0] * 5/2);
                z = randomNumber(camera.position.z - RANGE_NOISE[0] * 5/2, camera.position.z + RANGE_NOISE[0] * 5/2);

                hitDist = getHeightAtPoint(x, z, camera.position.y);
                y = camera.position.y + (RANGE_NOISE[0] * 5/2) - 1 - hitDist
            } while (y <= camera.position.y - (RANGE_NOISE[0] * 5/2));

            p.mesh.position = new BABYLON.Vector3(x, y, z);

            
            if(camera.position.y > p.max || camera.position.y < p.min ) {
                for (let c of p.mesh._children) {
                    c.isVisible = false;
                }
            } else {
                for (let c of p.mesh._children) {
                    c.isVisible = true;
                }
            }
        }
    }

    for(let f of activeFish) {
        if(isOOB(f.mesh.position, camera.position)){
            let _x = randomNumber(camera.position.x - RANGE_NOISE[0] * 5/2, camera.position.x + RANGE_NOISE[0] * 5/2);
            let _y = randomNumber(camera.position.y - RANGE_NOISE[0] * 5/2, camera.position.y + RANGE_NOISE[0] * 5/2);
            let _z = randomNumber(camera.position.z - RANGE_NOISE[0] * 5/2, camera.position.z + RANGE_NOISE[0] * 5/2);

            f.mesh.position = new BABYLON.Vector3(_x, _y, _z);

            if(camera.position.y > f.max || camera.position.y < f.min ) {
                for (let c of f.mesh._children) {
                    c.isVisible = false;
                }
            } else {
                for (let c of f.mesh._children) {
                    c.isVisible = true;
                }
            }

        } else {
            dt = scene.getEngine().getDeltaTime() / 1000
            x = f.mesh.position.x
            newX = x + dt * f.speed
            f.mesh.position = new BABYLON.Vector3(newX, f.mesh.position.y, f.mesh.position.z);
        }
    }
    // make fish move at speed

}