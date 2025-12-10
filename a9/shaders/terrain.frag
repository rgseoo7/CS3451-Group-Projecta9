#version 330 core

layout (std140) uniform camera
{
	mat4 projection;
	mat4 view;
	mat4 pvm;
	mat4 ortho;
	vec4 position;
};

/* set light ubo. do not modify.*/
struct light
{
	ivec4 att; 
	vec4 pos; // position
	vec4 dir;
	vec4 amb; // ambient intensity
	vec4 dif; // diffuse intensity
	vec4 spec; // specular intensity
	vec4 atten;
	vec4 r;
};
layout(std140) uniform lights
{
	vec4 amb;
	ivec4 lt_att; // lt_att[0] = number of lights
	light lt[4];
};

uniform float iTime;
uniform mat4 model;		/*model matrix*/

in vec3 vtx_pos;

out vec4 frag_color;


uniform vec3 ka;            /* object material ambient */
uniform vec3 kd;            /* object material diffuse */
uniform vec3 ks;            /* object material specular */
uniform float shininess;    /* object material shininess */

vec2 hash2(vec2 v)
{
	vec2 rand = vec2(0,0);
	
	rand  = 50.0 * 1.05 * fract(v * 0.3183099 + vec2(0.71, 0.113));
    rand = -1.0 + 2 * 1.05 * fract(rand.x * rand.y * (rand.x + rand.y) * rand);
	return rand;
}

float perlin_noise(vec2 v) 
{
    float noise = 0;
	vec2 i = floor(v);
    vec2 f = fract(v);
    vec2 m = f*f*(3.0-2.0*f);
	
	noise = mix( mix( dot( hash2(i + vec2(0.0, 0.0)), f - vec2(0.0,0.0)),
					 dot( hash2(i + vec2(1.0, 0.0)), f - vec2(1.0,0.0)), m.x),
				mix( dot( hash2(i + vec2(0.0, 1.0)), f - vec2(0.0,1.0)),
					 dot( hash2(i + vec2(1.0, 1.0)), f - vec2(1.0,1.0)), m.x), m.y);
	return noise;
}

float noiseOctave(vec2 v, int num)
{
	float sum = 0;
	for(int i =0; i<num; i++){
		sum += pow(2,-1*i) * perlin_noise(pow(2,i) * v);
	}
	return sum;
}

float height(vec2 v){
    float h = 0.0;
    h = 0.75 * noiseOctave(v, 10);
    if (h < 0.0) h *= 0.5;
    return h * 0.6;  // was 2.0 – much flatter now
}


vec3 compute_normal(vec2 v, float d)
{	
	vec3 normal_vector = vec3(0,0,0);
	vec3 v1 = vec3(v.x + d, v.y, height(vec2(v.x + d, v.y)));
	vec3 v2 = vec3(v.x - d, v.y, height(vec2(v.x - d, v.y)));
	vec3 v3 = vec3(v.x, v.y + d, height(vec2(v.x, v.y + d)));
	vec3 v4 = vec3(v.x, v.y - d, height(vec2(v.x, v.y - d)));
	
	normal_vector = normalize(cross(v1-v2, v3-v4));
	return normal_vector;
}

vec4 shading_phong(light li, vec3 e, vec3 p, vec3 s, vec3 n) 
{
    vec3 v = normalize(e - p);
    vec3 l = normalize(s - p);
    vec3 r = normalize(reflect(-l, n));

    vec3 ambColor = ka * li.amb.rgb;
    vec3 difColor = kd * li.dif.rgb * max(0., dot(n, l));
    vec3 specColor = ks * li.spec.rgb * pow(max(dot(v, r), 0.), shininess);

    return vec4(ambColor + difColor + specColor, 1);
}

vec3 apply_fog(vec3 color, vec3 worldPos)
{
    vec3 camPos = position.xyz;
    float distToCam = length(worldPos - camPos);

    // push fog a bit farther out
    float fogStart = 8.0;
    float fogEnd   = 30.0;

    float fogFactor = clamp((fogEnd - distToCam) / (fogEnd - fogStart), 0.0, 1.0);

    // brighter night sky so distant ground isn't pure black
    vec3 fogColor = vec3(0.06, 0.09, 0.16);

    return mix(fogColor, color, fogFactor);
}


// Returns a blend factor in [0,1]:
// 1 = full grass, 0 = full path (dirt)
float path_factor(vec2 p)
{
    // p is pos.xy from the original plane space
    float y = p.y;

    // center line of the path: a gentle curve
    float centerX = 0.3 * sin(1.5 * y);

    // distance in x from the path center
    float dist = abs(p.x - centerX);

    // control path width and edge softness
    float pathHalfWidth = 0.12;      // adjust to make the path wider/narrower
    float edgeSoftness = 0.08;

    // smoothstep(from, to, x): 0 when x<=from, 1 when x>=to
    // We want: factor=0 near center, factor=1 far away
    float f = smoothstep(pathHalfWidth, pathHalfWidth + edgeSoftness, dist);

    return f; // 0 near path, 1 away from path
}


// Draw the terrain
vec3 shading_terrain(vec3 pos) {
    vec3 n = compute_normal(pos.xy, 0.01);
    vec3 e = position.xyz;
    vec3 p = pos.xyz;
    vec3 s = lt[0].pos.xyz;

    n = normalize((model * vec4(n, 0)).xyz);
    p = (model * vec4(p, 1)).xyz;

    vec3 lambertPhong = shading_phong(lt[0], e, p, s, n).xyz;

    // --- existing height-based grass tint ---
    float h = pos.z + .8;
    h = clamp(h, 0.0, 1.0);
    vec3 grassTint = mix(vec3(.4, .6, .2), vec3(.4, .3, .2), h);
    vec3 grassColor = lambertPhong * grassTint;

    // --- new dirt path color ---
    vec3 dirtColor = vec3(0.35, 0.26, 0.18); // warm brown; tweak as you like

    // pathFactor = 0 on path, 1 away from path
    float f = path_factor(pos.xy);

    // blend: near path -> more dirt, away -> more grass
    vec3 groundColor = mix(dirtColor, grassColor, f);

    // apply fog based on world-space position p
    groundColor = apply_fog(groundColor, p);

    return groundColor;
}


void main()
{
    frag_color = vec4(shading_terrain(vtx_pos), 1.0);
}
