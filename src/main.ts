import {vec3, vec4, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

import ParticleSystem from './particlesystem';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  'Load Scene': loadScene, // A function pointer, essentially
  Mesh: 'Bunny',
  explodeOnClick: false,
};

let square: Square;
let time: number = 0.0;

let camera : Camera;

let flag = false;
let output : string[][] = [];

let particlesystem : ParticleSystem;

function loadScene() {
  square = new Square();
  square.create();

  particlesystem = new ParticleSystem(60);
  let arrays = particlesystem.updateParticles(1/60);
  let offsets: Float32Array = new Float32Array(arrays.offsets);
  let colors: Float32Array = new Float32Array(arrays.colors);
  square.setInstanceVBOs(offsets, colors);
  square.setNumInstances(offsets.length / 3); // 10x10 grid of "particles"
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();

  gui.add(controls, 'Mesh',  [ 'Bunny', 'Teapot']);
  gui.add(controls, 'explodeOnClick');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();
  readTextFile(require('./geometry/bunny2.obj'), 0 ,0);
  readTextFile(require('./geometry/teapot2.obj'), 0 ,1);

  camera = new Camera(vec3.fromValues(0, 0, 100), vec3.fromValues(0, 20, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // Additive blending

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/particle-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/particle-frag.glsl')),
  ]);

  // This function will be called every frame
  function tick() {

    camera.update();
    vec3.copy(particlesystem.eyeDir,camera.forward);
    if(flag) {
      
      let bunny = loadMeshData(output[0][0]);
      let teapot = loadMeshData(output[0][1]);
      if(bunny.vertexCount == 0 || teapot.vertexCount == 0) {
        
      } else {
        particlesystem.initFromOBJ(bunny.vertices, 10, 0);
        particlesystem.initFromOBJ(teapot.vertices, 10, 1);
        let arrays = particlesystem.updateParticles(1/60);
        let offsets: Float32Array = new Float32Array(arrays.offsets);
        let colors: Float32Array = new Float32Array(arrays.colors);
        square.setInstanceVBOs(offsets, colors);
        square.setNumInstances(offsets.length / 3);
        flag = false;
      }
    }
    if(controls.Mesh == "Bunny") {
      particlesystem.target = 0;      
    }
    else if(controls.Mesh == "Teapot") {
      particlesystem.target = 1;
    }
    
    let arrays = particlesystem.updateParticles(1/60);
    let offsets: Float32Array = new Float32Array(arrays.offsets);
    let colors: Float32Array = new Float32Array(arrays.colors);
    square.setInstanceVBOs(offsets, colors);

    stats.begin();
    lambert.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    renderer.render(camera, lambert, [
      square,
    ]);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}



main();


function readTextFile(file: string, i: number, j : number)
{
  flag=false;
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, true);
    var allText = "";
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                allText = rawFile.responseText;
                setOutputText(allText, i, j);
                //alert(allText);
            }
        }
    }
    rawFile.send(null);
    return allText;
}

function setOutputText(allText:string, i : number, j : number) {
  flag = false;
  if(output[i] == undefined) {
    output[i] = [];
  }
  output[i][j]  = allText;
  flag = true;
}

// https://dannywoodz.wordpress.com/2014/12/16/webgl-from-scratch-loading-a-mesh/

function loadMeshData(string: string) {
  if (string == undefined) {
    console.log("string undefined");
    flag = true;
    return {
      primitiveType: 'TRIANGLES',
      vertices: [],
      vertexCount: 0
    };
  }
  var lines = string.split("\n");
  var positions : vec3[] = [];
  var normals : vec3[] = [];
  var vertices : number[] = [];
 
  for ( var i = 0 ; i < lines.length ; i++ ) {
    var parts = lines[i].trimRight().split(' ');
    if ( parts.length > 0 ) {
      switch(parts[0]) {
        case 'v':  positions.push(
          vec3.fromValues(
            parseFloat(parts[1]),
            parseFloat(parts[2]),
            parseFloat(parts[3])
          ));
          break;
        case 'vn':
          normals.push(
            vec3.fromValues(
              parseFloat(parts[1]),
              parseFloat(parts[2]),
              parseFloat(parts[3])
          ));
          break;
        case 'f': {
          var f1 = parts[1].split('/');
          var f2 = parts[2].split('/');
          var f3 = parts[3].split('/');
          Array.prototype.push.apply(
            vertices, positions[parseInt(f1[0]) - 1]
          );
          Array.prototype.push.apply(
            vertices, normals[parseInt(f1[2]) - 1]
          );
          Array.prototype.push.apply(
            vertices, positions[parseInt(f2[0]) - 1]
          );
          Array.prototype.push.apply(
            vertices, normals[parseInt(f2[2]) - 1]
          );
          Array.prototype.push.apply(
            vertices, positions[parseInt(f3[0]) - 1]
          );
          Array.prototype.push.apply(
            vertices, normals[parseInt(f3[2]) - 1]
          );
          break;
        }
      }
    }
  }
  var vertexCount = vertices.length / 6;
  return {
    primitiveType: 'TRIANGLES',
    vertices: vertices,
    vertexCount: vertexCount
  };
}

document.addEventListener('mousedown', function(event) {
  if(controls.explodeOnClick) {
    let x = event.clientX;
    let y = event.clientY;
    let u = x * 2.0 / window.innerWidth - 1.0;
    let v = -(y * 2.0 / window.innerHeight - 1.0);

    let imageAspectRatio = window.innerWidth / window.innerHeight; // assuming width > height 
    let fov = 45.0;
    let Px = (u) * Math.tan(fov / 2.0 * Math.PI / 180.0) * imageAspectRatio; 
    let Py = (v) * Math.tan(fov / 2.0 * Math.PI / 180.0);
    let ray_O = vec4.fromValues(0.0,0.0,0.0,1.0); 
    let ray_Dir = vec4.create();
    vec4.subtract(ray_Dir, vec4.fromValues(Px,Py,-1,1.0), ray_O);
    vec4.normalize(ray_Dir,ray_Dir);
      let invViewMatrix = mat4.create();
      mat4.invert(invViewMatrix,camera.viewMatrix);
      vec4.transformMat4(ray_O,ray_O,invViewMatrix);
      vec4.transformMat4(ray_Dir,ray_Dir,invViewMatrix);
      vec4.normalize(ray_Dir,ray_Dir);
      particlesystem.explodeParticles(vec3.fromValues(ray_Dir[0],ray_Dir[1],ray_Dir[2]),vec3.fromValues(ray_O[0],ray_O[1],ray_O[2]), 1/60)
  }
});