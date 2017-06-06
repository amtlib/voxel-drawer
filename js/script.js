
var size = 900, step = 50;
if (!Detector.webgl) Detector.addGetWebGLMessage();

var container;
var camera, scene, renderer;
var plane, cube;
var mouse, raycaster, isShiftDown = false;

var rollOverMesh, rollOverMaterial;
var cubeGeo, cubeMaterial;


var placed_players = 0;

var block_type = 'block';
var material_type = 'block';
var block_h = 1;

var camera_down = false;
var camera_up = false;
var camera_left = false;
var camera_right = false;
var camera_rotate_right = false;
var camera_rotate_left = false;

var plane_size_range;


var materials = {
    block: new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load('gfx/materials/normal.png') }),
    jumping: new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load('gfx/materials/jumping.png') }),
    button: new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load('gfx/materials/button.png') }),
    player: new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load('gfx/materials/player.png') }),
}

var output_code_array = []

var objects = [];

var editorGUI = function () {

    this.plane_size = 30;

    this.get_json = function () {
        if (document.getElementById('json_code').style.display == 'none') {
            let temp_array = []
            let temp_players_count = 0;
            for (let i = 1; i < objects.length; i++) {
                if (objects[i].userData.type == 'player') {
                    temp_array.push([objects[i].userData.type, [objects[i].position.x / step + .5, objects[i].position.y / step + .5, objects[i].position.z / step + .5], temp_players_count++])
                } else {
                    temp_array.push([objects[i].userData.type, [objects[i].position.x / step + .5, objects[i].position.y / step + .5, objects[i].position.z / step + .5], [objects[i].scale.x, objects[i].scale.y, objects[i].scale.z], objects[i].userData.material])
                }
            }
            document.querySelector('#json_code textarea').value = JSON.stringify(temp_array, null, 4);
            document.getElementById('json_code').style.display = 'block'
        } else {
            document.getElementById('json_code').style.display = 'none'
        }
    };

    this.material = 'block';
    this.block_type = 'block';
    this.block_h = 1;
};

document.addEventListener('DOMContentLoaded', function () {
    init();
    render();

    document.getElementById('json_code').style.display = 'none'

    var text = new editorGUI();
    var gui = new dat.GUI();
    plane_size_range = gui.add(text, 'plane_size', 1, 30).step(1);
    plane_size_range.onChange(function (value) {
        let temp_size = value * value
        temp_size /= 100;
        temp_size = Math.floor(temp_size)
        temp_size *= 100;

        for (let i = 0; i < objects.length; i++) {
            if (objects[i].userData.partOfFloor == true) {
                scene.remove(objects[i])
                objects.splice(i--, 1)
            }
        }
        generateFloor(temp_size, step)
    })


    gui.add(text, 'get_json');
    gui.add(text, 'block_type', ['block', 'jumping', 'button', 'player']).onChange(function (value) {
        block_type = value;
    });
    gui.add(text, 'block_h').min(0).max(1).step(.1).onChange(function (value) {
        block_h = value;
    });
    gui.add(text, 'material', ['block', 'jumping', 'button']).onChange(function (value) {
        material_type = value;
    });


    //camera controller
    var orbitControl = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControl.addEventListener('change', function () {
        renderer.render(scene, camera)
    });

})


function init() {

    container = document.getElementById('container');


    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(500, 800, 1300);
    camera.lookAt(new THREE.Vector3());

    scene = new THREE.Scene();

    rollOverGeo = new THREE.BoxGeometry(50, 50, 50);
    rollOverMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
    rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
    scene.add(rollOverMesh);

    var axis = new THREE.AxisHelper(500);
    scene.add(axis)

    cubeGeo = new THREE.BoxGeometry(50, 50, 50);
    
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

    document.getElementById('container').addEventListener('mousemove', onDocumentMouseMove, false);
    document.getElementById('container').addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
    document.addEventListener('keyup', onDocumentKeyUp, false);

    window.addEventListener('resize', onWindowResize, false);

    render();
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
            if (block_type != 'player' || (block_type == 'player' && placed_players < 3)) {
                if (block_type == 'player') {
                    placed_players++;
                }

                var voxel = new THREE.Mesh(cubeGeo.clone(), materials[material_type]);
                voxel.scale.y = block_h
                voxel.position.copy(intersect.point).add(intersect.face.normal);
                voxel.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
                scene.add(voxel);
                voxel.userData = { type: block_type, material: material_type }
                if (block_h < 1) {
                    voxel.position.y = voxel.position.y - step / 2 + step * block_h - step * block_h / 2
                }
                objects.push(voxel);
            }

        }

        render();

    }

}

function onDocumentKeyDown(event) {
    console.log(event.keyCode)
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
            voxel.position.x = i * step + step / 2;
            voxel.position.y = step / 2
            voxel.position.z = j * step + step / 2;
            scene.add(voxel);
            voxel.userData = { type: 'block', material: 'block', partOfFloor: true }
            objects.push(voxel);
        }
    }
}

function render() {
    renderer.render(scene, camera);
    requestAnimationFrame(render)
}

