#version 300 es
precision highp float;

in vec4 fs_Col;
in vec4 fs_Pos;

out vec4 out_Col;

void main()
{
    float x = fs_Pos.x;
    if(mod(fs_Pos.x,10.0) < 0.5 || mod(fs_Pos.z,10.0) < 0.5) {
        out_Col = vec4(255/255,2/255,255/255, 1.0);
    }

}
