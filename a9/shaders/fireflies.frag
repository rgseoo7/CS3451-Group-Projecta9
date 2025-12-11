#version 330 core

uniform vec2 iResolution;
uniform float iTime;
uniform int iFrame;

in vec3 vtx_pos; // [-1, 1]
in vec2 vtx_uv; // [0, 1]

out vec4 frag_color;

#define NUM_FLIES 20.

// return random vec2 between 0 and 1
vec2 hash2d(float t)
{
    t += 1.;
    float x = fract(sin(t * 439.3) * 781.9);
    float y = fract(sin((t + x) * 636.4) * 323.11);

    return vec2(x, y);
}

vec3 renderParticle(vec2 uv, vec2 pos, float brightness, vec3 color)
{
    float d = length(uv - pos);
    return brightness / d * color;
}

vec2 moveParticle(vec2 initPos, vec2 vel, float t, float i)
{
    vec2 currentPos = initPos;
    currentPos = initPos + (vel * t) + vec2(sin(t + i), cos(t - i));
    if (currentPos.x > 1.2) {
        currentPos.x = -currentPos.x + 0.1;
    } else if (currentPos.x < -1.2) {
        currentPos.x = -currentPos.x - 0.1;
    }
    if (currentPos.y > 1.2) {
        currentPos.y = -currentPos.y + 0.1;
    } else if (currentPos.y < -1.2) {
        currentPos.y = -currentPos.y - 0.1;
    }
    return currentPos;
}

vec3 renderFireflies(vec2 uv)
{
    vec3 fragColor = vec3(0.0);

    float t = iTime;
    for(float i = 0.; i < NUM_FLIES; i++)
    {
        vec2 pos = hash2d(i) * 2. - 1.; // map to [-1, 1]
        vec2 vel = hash2d(i + pos.x) * 2. - 1.;
        float brightness = .007;
        brightness *= sin(1.5 * t + i) * .5 + .5; // flicker
        vec3 color = vec3(0.65, 0.71, 0.12);

        fragColor += renderParticle(uv, moveParticle(pos, vel, t, i), brightness, color);
    }

    return fragColor;
}

void main()
{
    vec3 outputColor = renderFireflies(vtx_pos.xy);

    vec2 uv = vec2(vtx_uv.x, -vtx_uv.y);

    frag_color = vec4(outputColor, 1.0);
}