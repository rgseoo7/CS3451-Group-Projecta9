#version 330 core

layout (std140) uniform camera
{
    mat4 projection;
    mat4 view;
    mat4 pvm;
    mat4 ortho;
    vec4 position;
};

struct light
{
    ivec4 att; 
    vec4 pos;   // position
    vec4 dir;
    vec4 amb;   // ambient intensity
    vec4 dif;   // diffuse intensity
    vec4 spec;  // specular intensity
    vec4 atten;
    vec4 r;
};

layout(std140) uniform lights
{
    vec4 amb;
    ivec4 lt_att; // lt_att[0] = number of lights
    light lt[4];
};

uniform mat4  model;
uniform vec3  ka;          // material ambient
uniform vec3  kd;          // material diffuse
uniform vec3  ks;          // material specular
uniform float shininess;

in vec3 vtx_world_pos;
in vec3 vtx_world_nor;
in vec3 vtx_local_pos;

out vec4 frag_color;

// Basic Phong shading helper
vec3 shade_phong(light li, vec3 e, vec3 p, vec3 n)
{
    vec3 v = normalize(e - p);
    vec3 l = normalize(li.pos.xyz - p);
    vec3 r = normalize(reflect(-l, n));

    vec3 ambColor  = ka * li.amb.rgb;
    vec3 difColor  = kd * li.dif.rgb * max(dot(n, l), 0.0);
    vec3 specColor = ks * li.spec.rgb * pow(max(dot(v, r), 0.0), shininess);

    return ambColor + difColor + specColor;
}

vec3 apply_fog(vec3 color, vec3 worldPos)
{
    vec3 camPos = position.xyz;
    float distToCam = length(worldPos - camPos);

    // Your scene is small, so keep fog distances modest
    float fogStart = 2.5;   // start fading after this distance
    float fogEnd   = 9.0;   // mostly fogged by here

    // 0 near, 1 far
    float t = clamp((distToCam - fogStart) / (fogEnd - fogStart), 0.0, 1.0);

    // Tone the fog down so it’s subtle
    float maxFog = 0.35;    // only fade ~35% into fog color at max distance
    t *= maxFog;

    // Neutral, slightly cool gray (not super blue)
    vec3 fogColor = vec3(0.35, 0.38, 0.42);

    return mix(color, fogColor, t);
}

void main()
{
    vec3 n = normalize(vtx_world_nor);
    vec3 e = position.xyz;
    vec3 p = vtx_world_pos;   // world-space position

    // Base lighting (white diffuse)
    vec3 basePhong = shade_phong(lt[0], e, p, n);

    // ---- Color by local Y: trunk bottom, leaves top ----
    float y = vtx_local_pos.y;

    // tweak if needed, but this worked for you before
    float t = smoothstep(0.9, 1.6, y);

    vec3 barkColor  = vec3(0.45, 0.25, 0.11);  // a bit stronger brown
    vec3 leafColor  = vec3(0.10, 0.35, 0.14);  // green leaves

    vec3 treeColor = mix(barkColor, leafColor, t);

    // base lit tree color
    vec3 color = basePhong * treeColor;

    // apply the SAME fog as terrain, using world-space p
    color = apply_fog(color, p);

    frag_color = vec4(color, 1.0);
}

