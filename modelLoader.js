//modelLoader.js

camera = 0;
scene = 0;
renderer = 0;

//scene elms
cube = 0;
mesh = 0;
player = 0;

function onLoad(){
    //renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(document.body.clientWidth, document.body.clientHeight);
    document.body.appendChild(renderer.domElement);
    renderer.setClearColorHex(0xeeeeee, 1.0);
    renderer.clear();
    //camera
    camera = new THREE.PerspectiveCamera(45, document.body.clientWidth/document.body.clientHeight, 1, 10000);
    camera.position.x = 300;
    camera.position.y = 100;
    //scene
    scene = new THREE.Scene();
    cube = new THREE.Mesh(new THREE.CubeGeometry(50,50,50),
                          new THREE.MeshLambertMaterial({color: 0xee0000}));
    var loader = new THREE.JSONLoader();
    loader.load( "models/river.js", configLandscape );
    //loader.load( "models/male02/Male02_slim.js", configPlayerMesh );
    //scene.add(cube);
    //lighting
    //var light = new THREE.SpotLight();
    //light.position.set( 170, 330, -160 );
    //scene.add(light);
}

function configLandscape(geometry){

    var material = new THREE.MeshFaceMaterial();
    mesh = new THREE.Mesh( geometry, material );
    mesh.material.shading = THREE.FlatShading;
    mesh.scale.set(5,5,5);
    scene.add( mesh );
    animate(new Date().getTime());
}
function configPlayerMesh(geometry){

    var material = new THREE.MeshFaceMaterial();
    player = new THREE.Mesh( geometry, material );
    player.scale.set(0.5,0.5,0.5);
    scene.add( player );
    animate(new Date().getTime());
}

function animate(t) {
    // spin the camera in a circle
    cube.rotation.y = t/1000;
    mesh.rotation = {x: 0, y: t/1000, z: 0};
    player.rotation = {x: 0, y: t/1000, z: 0};
    // you need to update lookAt every frame
    camera.lookAt(scene.position);
    // renderer automatically clears unless autoClear = false
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate, renderer.domElement);
};
    
