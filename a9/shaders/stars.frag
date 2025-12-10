#version 330 core

uniform vec2 iResolution;
uniform float iTime;
uniform int iFrame;

in vec3 vtx_pos; // [-1, 1]
in vec2 vtx_uv; // [0, 1]

out vec4 frag_color;

#define NUM_STARS 150.
#define PI 3.14159265359

// Hash function for random values
float hash1d(float t)
{
    t += 1.;
    return fract(sin(t * 674.3) * 453.2);
}

// Return random vec2 between 0 and 1
vec2 hash2d(float t)
{
    t += 1.;
    float x = fract(sin(t * 674.3) * 453.2);
    float y = fract(sin((t + x) * 714.3) * 263.2);
    return vec2(x, y);
}

// Return random vec3 between 0 and 1
vec3 hash3d(float t)
{
    t += 1.;
    float x = fract(sin(t * 674.3) * 453.2);
    float y = fract(sin((t + x) * 714.3) * 263.2);
    float z = fract(sin((t + y) * 134.3) * 534.2);
    return vec3(x, y, z);
}

// Render a single star particle
vec3 renderParticle(vec2 uv, vec2 pos, float brightness, vec3 color)
{
    float d = length(uv - pos);
    if (d > 0.0) {
        return brightness / d * color;
    }
    return vec3(0.0);
}

// Render the starry sky
vec3 renderStars(vec2 uv)
{
    // Start with black space background
    vec3 fragColor = vec3(0.0, 0.0, 0.02); // Very slight blue tint

    float t = iTime;
    
    // Main stars - small twinkling stars
    for(float i = 0.; i < NUM_STARS; i++)
    {
        vec2 pos = hash2d(i) * 2. - 1.; // map to [-1, 1]
        
        // Base brightness with twinkling
        float brightness = 0.0012;
        float twinkleSpeed = 1.0 + hash1d(i) * 2.0;
        brightness *= (sin(twinkleSpeed * t + i * 3.0) * 0.4 + 0.6);
        
        // Vary star sizes
        brightness *= (0.5 + hash1d(i + 50.0) * 1.0);
        
        // Star colors - mostly white/blue with some variation
        vec3 color = vec3(0.9, 0.95, 1.0); // Default white-blue
        float colorVar = hash1d(i + 100.0);
        if (colorVar > 0.8) {
            color = vec3(1.0, 0.9, 0.7);  // Warm yellow star
        } else if (colorVar > 0.6) {
            color = vec3(0.7, 0.85, 1.0); // Blue star
        } else if (colorVar > 0.4) {
            color = vec3(1.0, 0.7, 0.7);  // Red star
        }

        fragColor += renderParticle(uv, pos, brightness, color);
    }
    
    // Add a few brighter prominent stars
    for(float i = 0.; i < 15.; i++)
    {
        vec2 pos = hash2d(i + 500.0) * 2. - 1.;
        
        float brightness = 0.003 * (0.5 + sin(t * 0.3 + i * 2.0) * 0.5);
        vec3 color = hash3d(i + 500.0) * 0.3 + 0.7;
        
        fragColor += renderParticle(uv, pos, brightness, color);
    }

    return fragColor;
}

void main()
{
    // Render stars on black space background
    vec3 outputColor = renderStars(vtx_pos.xy);
    
    // Output final color (no buzz texture mixing)
    frag_color = vec4(outputColor, 1.0);
}
