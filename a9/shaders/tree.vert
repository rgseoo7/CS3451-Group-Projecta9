#version 330 core

layout (std140) uniform camera
{
    mat4 projection;
    mat4 view;
    mat4 pvm;
    mat4 ortho;
    vec4 position;
};

uniform mat4 model;

in vec3 vtx_pos;
in vec3 vtx_nor;

out vec3 vtx_world_pos;
out vec3 vtx_world_nor;
out vec3 vtx_local_pos;

void main()
{
    vec4 world_pos = model * vec4(vtx_pos, 1.0);
    vtx_world_pos  = world_pos.xyz;
    vtx_world_nor  = normalize((model * vec4(vtx_nor, 0.0)).xyz);
    vtx_local_pos  = vtx_pos;  // local coords from OBJ

    gl_Position = pvm * world_pos;
}

