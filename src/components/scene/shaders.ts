/**
 * @file GLSL shaders for Earth day/night blending and the atmosphere rim.
 */

export const earthVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const earthFragmentShader = `
  uniform sampler2D uDayTexture;
  uniform sampler2D uNightTexture;
  uniform vec3 uSunDirection;
  uniform float uCityLightsBoost;

  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
    vec3 nightColor = texture2D(uNightTexture, vUv).rgb;

    float sunDot = dot(normalize(vNormal), normalize(uSunDirection));
    // Soft terminator line between day and night
    float dayFactor = smoothstep(-0.25, 0.25, sunDot);

    // The night side keeps a dim view of the land so the globe never reads as a
    // black disc, with city lights glowing on top.
    vec3 nightLights = nightColor * (1.2 + uCityLightsBoost * 1.4);
    vec3 nightSide = dayColor * 0.32 + nightLights;
    vec3 daySide = dayColor * 1.08;
    vec3 color = mix(nightSide, daySide, dayFactor);

    gl_FragColor = vec4(color, 1.0);
    // Textures are decoded to linear light on sampling; encode back for the screen.
    // Without this the whole globe renders far too dark.
    #include <colorspace_fragment>
  }
`;

export const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const atmosphereFragmentShader = `
  uniform vec3 uRimColor;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // Fresnel rim glow
    float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.2);
    float alpha = smoothstep(0.0, 1.0, fresnel) * uIntensity;

    gl_FragColor = vec4(uRimColor, alpha);
  }
`;
