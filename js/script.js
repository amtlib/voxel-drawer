

if (!Detector.webgl) Detector.addGetWebGLMessage();

var container;
var camera, scene, renderer;
var plane, cube;
var mouse, raycaster, isShiftDown = false;

var rollOverMesh, rollOverMaterial;
var cubeGeo, cubeMaterial;

var selectedBlock = 'block';
var selectedMaterial = 'block';
var placed_players = 0

var materials = {
    block: new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load('gfx/materials/normal.png') }),
    jumping: new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load('gfx/materials/jumping.png') }),
    button: new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load('gfx/materials/button.png') }),
    player: new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load('gfx/materials/player.png') }),
}

var output_code_array = []

var objects = [];
document.addEventListener('DOMContentLoaded', function () {
    init();
    render();
    document.getElementById('json_code').style.display = 'none'

    //display json window
    document.getElementById('get_json').addEventListener('click', () => {
        if (document.getElementById('json_code').style.display == 'none') {
            let temp_array = []
            let temp_players_count = 0;
            for (let i = 1; i < objects.length; i++) {
                if (objects[i].userData.type == 'player') {
                    temp_array.push([objects[i].userData.type, [objects[i].position.x / 50 + .5, objects[i].position.y / 50 + .5, objects[i].position.z / 50 + .5], temp_players_count++])
                } else {
                    temp_array.push([objects[i].userData.type, [objects[i].position.x / 50 + .5, objects[i].position.y / 50 + .5, objects[i].position.z / 50 + .5], [1, 1, 1], objects[i].userData.material])
                }

            }
            document.querySelector('#json_code textarea').value = JSON.stringify(temp_array, null, 4);
            document.getElementById('json_code').style.display = 'block'
        } else {
            document.getElementById('json_code').style.display = 'none'
        }
    })

    //select materials
    document.getElementById('block_voxel').addEventListener('click', function () {
        selectedMaterial = 'block'
        selectedBlock = 'block'
    })

    document.getElementById('button_voxel').addEventListener('click', function () {
        selectedMaterial = 'button'
        selectedBlock = 'button'
    })
    document.getElementById('jumping_voxel').addEventListener('click', function () {
        selectedMaterial = 'jumping'
        selectedBlock = 'jumping'
    })
    document.getElementById('player_voxel').addEventListener('click', function () {
        selectedMaterial = 'player'
        selectedBlock = 'player'
    })


    //camera controller
    var orbitControl = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControl.addEventListener('change', function () {
        renderer.render(scene, camera)
    });

})


function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    //var info = document.createElement('div');
    //info.style.position = 'absolute';
    //info.style.top = '10px';
    //info.style.width = '100%';
    //info.style.textAlign = 'center';
    //info.innerHTML = '<a href="http://threejs.org" target="_blank">three.js</a> - voxel painter - webgl<br><strong>click</strong>: add voxel, <strong>shift + click</strong>: remove voxel';
    //container.appendChild(info);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(500, 800, 1300);
    camera.lookAt(new THREE.Vector3());

    scene = new THREE.Scene();

    // roll-over helpers

    rollOverGeo = new THREE.BoxGeometry(50, 50, 50);
    rollOverMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
    rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
    scene.add(rollOverMesh);

    // cubes

    cubeGeo = new THREE.BoxGeometry(50, 50, 50);
    jumpingGeo = new THREE.BoxGeometry(50, 5, 50);
    //cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xfeb74c, map: new THREE.TextureLoader().load("textures/square-outline-textured.png") });

    // grid

    var size = 1000, step = 50;

    var geometry = new THREE.Geometry();

    for (var i = - size; i <= size; i += step) {

        geometry.vertices.push(new THREE.Vector3(- size, 0, i));
        geometry.vertices.push(new THREE.Vector3(size, 0, i));

        geometry.vertices.push(new THREE.Vector3(i, 0, - size));
        geometry.vertices.push(new THREE.Vector3(i, 0, size));

    }

    var material = new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.2, transparent: true });

    var line = new THREE.LineSegments(geometry, material);
    scene.add(line);
    // floor
    generateFloor(size, step)
    //

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    var geometry = new THREE.PlaneBufferGeometry(size * 2, size * 2);
    geometry.rotateX(- Math.PI / 2);

    plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ visible: false }));
    scene.add(plane);

    objects.push(plane);

    // Lights

    var ambientLight = new THREE.AmbientLight(0x606060);
    scene.add(ambientLight);

    var directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, 0.75, 0.5).normalize();
    scene.add(directionalLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xf0f0f0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
    document.addEventListener('keyup', onDocumentKeyUp, false);

    //

    window.addEventListener('resize', onWindowResize, false);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function onDocumentMouseMove(event) {

    event.preventDefault();

    mouse.set((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1);

    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(objects);

    if (intersects.length > 0) {

        var intersect = intersects[0];

        rollOverMesh.position.copy(intersect.point).add(intersect.face.normal);
        rollOverMesh.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);

    }

    render();

}

function onDocumentMouseDown(event) {

    event.preventDefault();

    mouse.set((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1);

    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(objects);

    if (intersects.length > 0) {

        var intersect = intersects[0];

        // delete cube

        if (isShiftDown) {

            if (intersect.object != plane) {
                if (intersect.object.userData.type == 'player') {
                    placed_players--;
                }
                scene.remove(intersect.object);

                objects.splice(objects.indexOf(intersect.object), 1);

            }

            // create cube

        } else {
            if (selectedBlock != 'player' || (selectedBlock == 'player' && placed_players < 3)) {
                if (selectedBlock == 'player') {
                    placed_players++;
                }
                if (selectedBlock == 'jumping') {
                    var voxel = new THREE.Mesh(jumpingGeo, materials[selectedMaterial]);
                } else {
                    var voxel = new THREE.Mesh(cubeGeo, materials[selectedMaterial]);
                }

                voxel.position.copy(intersect.point).add(intersect.face.normal);
                voxel.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
                scene.add(voxel);
                voxel.userData = { type: selectedBlock, material: selectedMaterial }
                objects.push(voxel);
            }

        }

        render();

    }

}

function onDocumentKeyDown(event) {

    switch (event.keyCode) {

        case 16: isShiftDown = true; break;

    }

}

function onDocumentKeyUp(event) {

    switch (event.keyCode) {

        case 16: isShiftDown = false; break;

    }

}

function generateFloor(size, step) {
    for (let i = -size / step; i < size / step; i++) {
        for (let j = -size / step; j < size / step; j++) {
            var voxel = new THREE.Mesh(cubeGeo, materials['block']);
            voxel.position.x = i * step + step / 2
            voxel.position.y = step / 2
            voxel.position.z = j * step + step / 2
            scene.add(voxel);
            voxel.userData = { type: 'block', material: 'block' }
            objects.push(voxel);

        }
    }
}

function render() {

    renderer.render(scene, camera);

}

