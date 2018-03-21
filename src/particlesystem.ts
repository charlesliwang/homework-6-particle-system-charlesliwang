import {vec2, vec3, vec4, mat4, quat} from 'gl-matrix';


function fade (t: number) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); 
}


function mix( x0 : number,  x1 : number,  t: number) {
    return (1.0 - t) * x0 + (t * x1);
}

function hash(x: number) {
    let f = Math.sin(vec3.dot(vec3.fromValues(x,x,x), vec3.fromValues(12.9898, 78.233, 78.156))) * 43758.5453;
    return (f - Math.floor(f) - 0.5) * 2.0;
}

function noise_gen3D(pos : vec3) {
    let noise = vec3.fromValues(hash(pos[0] + pos[1] * pos[2]),hash((pos[1] - pos[0])*300 ), hash((pos[2] * pos[0] + pos[1]) * 100 ));
    return noise;
}

function dotGridGradient( grid: vec3, pos : vec3) {
    let noise = noise_gen3D(grid);
    vec3.normalize(noise,noise);
    let diff = vec3.create();
    vec3.subtract(diff,pos,grid);
    let dot = vec3.dot(noise,diff);
    return dot;
}

function perlin3D( p : vec3,  step: number) {
    let pos = vec3.create();
    vec3.scale(pos,p,1/step);
    let ming = vec3.create();
    vec3.floor(ming,pos);
    let maxg = vec3.create();
    vec3.add(maxg,ming,[1,1,1]);
    let diff = vec3.create();
    vec3.subtract(diff,pos, ming);
    let d000 = dotGridGradient(ming, pos);
    let d001 = dotGridGradient(vec3.fromValues(ming[0], ming[1], maxg[2]), pos);
    let d010 = dotGridGradient(vec3.fromValues(ming[0], maxg[1], ming[2]), pos);
    let d011 = dotGridGradient(vec3.fromValues(ming[0], maxg[1], maxg[2]), pos);
    let d111 = dotGridGradient(vec3.fromValues(maxg[0], maxg[1], maxg[2]), pos);
    let d100 = dotGridGradient(vec3.fromValues(maxg[0], ming[1], ming[2]), pos);
    let d101 = dotGridGradient(vec3.fromValues(maxg[0], ming[1], maxg[2]), pos);
    let d110 = dotGridGradient(vec3.fromValues(maxg[0], maxg[1], ming[2]), pos);

    let ix00 = mix(d000,d100, fade(diff[0]));
    let ix01 = mix(d001,d101, fade(diff[0]));
    let ix10 = mix(d010,d110, fade(diff[0]));
    let ix11 = mix(d011,d111, fade(diff[0]));

    let iy0 = mix(ix00, ix10, fade(diff[1]));
    let iy1 = mix(ix01, ix11, fade(diff[1]));

    let iz = mix(iy0, iy1, fade(diff[2]));


    return (iz + 1.0) / 2.0;
}

let c1 = vec3.fromValues(178/255,16/255,65/255);
let c2 = vec3.fromValues(12/255,141/255,178/255);
let c3 = vec3.fromValues(255/255,31/255,99/255);

function mapColor(t : number) {
    let col = vec3.create();
    vec3.lerp(col,c1,c2, fade(t) );
    if(t > 1) {
        vec3.lerp(col,c2,c3, fade(t - 1) );
    }
    return col;
}

class Particle {

    pos: vec3;
    vel: vec3;
    force: vec3;
    target: vec3[] = [];
    targetNorm: vec3[] = [];

    constructor(pos: vec3) {
        this.pos = pos;
    }

}

class ParticleSystem {

    particles: Particle[] = [];
    n : number = 5000;
    target: number = 0;
    attract: number = 10;
    eyeDir: vec3 = vec3.fromValues(0,0,1);


    constructor(numparticles : number) {
        let n: number = numparticles;
        this.n = n*n;
        for(let i = 0; i < n; i++) {
          for(let j = 0; j < n; j++) {
              let particle = new Particle(vec3.fromValues(i - n/2,j - n/2,0));
              particle.target.push(vec3.fromValues(i - n/2,j - n/2,0));
              particle.targetNorm.push(vec3.fromValues(0,0,1));
              let r = perlin3D(particle.pos, 2.0);
              particle.pos[2] = r * 10.0;
              particle.vel = vec3.fromValues(0,0,0);
              this.particles.push(particle);
          }
        }
    }

    initFromOBJ(vertices : number[], scale : number, idx : number) {
        //this.particles = [];
        let tris = vertices.length / 18;
        let pts_per_tri = Math.ceil(this.n / tris);
        for(let i = 0; i < vertices.length; i = i + 18) {
            let points : vec3[] = [];
            let norms : vec3[] = [];
            for(let j = 0; j < 3; j++) {
                let v1 = vertices[i + 6*j];
                let v2 = vertices[i+1 + 6*j];
                let v3 = vertices[i+2 + 6*j];
                let v = vec3.fromValues(v1,v2,v3);
                vec3.scale(v, v, scale);
                let axis = vec3.fromValues(0,1,0);
                let n1 = vertices[i+3 + 6*j];
                let n2 = vertices[i+4 + 6*j];
                let n3 = vertices[i+5 + 6*j];
                let n = vec3.fromValues(n1,n2,n3);
                norms[j] = n;
                points[j] = v;
            }
            for(let p = 0; p < pts_per_tri; p++) {
                if((i/18) + (p)*tris >= this.n){
                    break;
                }
                let center = vec3.fromValues(0,0,0);
                vec3.add(center,center,points[0]);
                vec3.add(center,center,points[1]);
                vec3.add(center,center,points[2]);
                vec3.scale(center,center,1/3);

                let norm = vec3.fromValues(0,0,0);
                vec3.add(norm,norm,norms[0]);
                vec3.add(norm,norm,norms[1]);
                vec3.add(norm,norm,norms[2]);
                vec3.scale(norm,norm,1/3);

                let off_dir = vec3.create();
                vec3.subtract(off_dir, points[p % 3], center);
                let dist = vec3.length(off_dir);
                vec3.scale(off_dir,off_dir,dist *(hash(center[0] * center[1]) + 1.0) /2.0);
                vec3.add(center,center,off_dir);
                //let particle = new Particle(center);
                let particle = this.particles[(i/18) + (p)*tris];
                particle.target[idx] = vec3.create();
                vec3.copy(particle.target[idx], center);
                particle.targetNorm[idx] = vec3.create();
                vec3.copy(particle.targetNorm[idx], norm);
                let r = perlin3D(particle.pos, 2.0);
                vec3.scale(norm,norm,r);
                vec3.add(particle.pos,particle.pos,norm);
                particle.vel = vec3.fromValues(0,0,0);
                //this.particles.push(particle);
            }
        }
    }

    updateParticles(dt: number) {
        
        let offsetsArray : number[] = [];
        let colorsArray : number[] = [];
        this.attract--;
        for(let i = 0; i < this.particles.length; i++) {
            let particle = this.particles[i];

            let force = vec3.create();
            vec3.subtract(force, particle.target[this.target], particle.pos);
            //vec3.scale(force,force,0.1);

            let targetvel = vec3.create();

            vec3.subtract(targetvel, particle.target[this.target], particle.pos);
            vec3.scale(targetvel,targetvel,dt * 5.0);

            vec3.normalize(force,force);
            //vec3.cross(force,force,[0,1,0]);
            let angle = perlin3D(particle.pos, 0.2);
            let q = quat.create();
            quat.setAxisAngle(q, [0,1,0], (angle - 0.5) * 2 * Math.PI );
            vec3.transformQuat(force,force,q);
            vec3.scale(force,force,dt);

            vec3.add(force,particle.vel,force);

            let dist = vec3.distance(particle.target[this.target], particle.pos) / 0.5;
            dist = Math.min(dist,1.0);
            if(dist < 1.0) {dist = 0.0;}
            
            if(this.attract < 0) {
                vec3.lerp(particle.vel, particle.vel, targetvel, dist);
            }

            let dp = vec3.create();
            vec3.scale(dp,particle.vel,dt);
            vec3.add(particle.pos,particle.pos,particle.vel);

            offsetsArray.push(this.particles[i].pos[0]);
            offsetsArray.push(this.particles[i].pos[1]);
            offsetsArray.push(this.particles[i].pos[2]);

            let dotCol = vec3.dot(this.eyeDir,this.particles[i].targetNorm[this.target]);

            let col = mapColor(fade(Math.abs(dotCol)) + vec3.length(particle.vel) * 2 + angle);
            //colorsArray.push(this.particles[i].pos[0]/ this.particles.length);
            let r = angle;
            //console.log(r);
            colorsArray.push(col[0]);
            colorsArray.push(col[1]);
            colorsArray.push(col[2]);
            colorsArray.push(1.0); // Alpha channel
        }
        return {'offsets' : offsetsArray, 'colors': colorsArray};
    }

    explodeParticles(ray: vec3, origin: vec3, dt : number) {
        
        for(let i = 0; i < this.particles.length; i++) {
            let particle = this.particles[i];
            let pos = vec3.create();
            vec3.subtract(pos, particle.pos, origin);
            let dist = vec3.dot(ray,pos);
            let fOrigin = vec3.create();
            vec3.scale(fOrigin,ray,dist);
            vec3.add(fOrigin,fOrigin,origin);
            // if(i == 0) {
            //     console.log(origin);
            //     console.log(ray);
            //     console.log(particle.pos);
            //     console.log(pos);
            //     console.log(dist);
            //     console.log(fOrigin);
            // }
            let force = vec3.create();

            let noise = perlin3D(particle.pos, 0.2);
            vec3.subtract(force,particle.pos,fOrigin);
            vec3.normalize(force,force);
            vec3.scale(force,force,dt * 50.0 * noise);
            vec3.copy(particle.vel,force);
            
        }
        this.attract = 30;
    }

}

export default ParticleSystem;