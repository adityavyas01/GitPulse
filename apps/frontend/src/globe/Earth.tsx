import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

import { getSunDirection } from './earthAstronomy.js';

const vertexShader = `
  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vLocal = position;
    vNormal = normalize(normalMatrix * normal);

    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vView = -view.xyz;

    gl_Position = projectionMatrix * view;
  }
`;

const fragmentShader = `
  uniform sampler2D earthTexture;
  uniform sampler2D nightLights;
  uniform vec3 sunDirection;

  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vec3 p = normalize(vLocal);
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(vView);

    float lon = atan(p.x, p.z);
    float lat = asin(clamp(p.y, -1.0, 1.0));

    vec2 uv = vec2(
      lon / 6.2831853 + 0.5,
      0.5 - lat / 3.14159265
    );

    vec3 tex = texture2D(earthTexture, uv).rgb;

    float sunDot = dot(p, normalize(sunDirection));

    float day = smoothstep(-0.16, 0.20, sunDot);

    float twilight = smoothstep(-0.30, 0.22, sunDot)
      * (1.0 - smoothstep(0.08, 0.48, sunDot));

    float night = 1.0 - smoothstep(-0.18, 0.12, sunDot);

    vec3 dayColor = tex * (0.62 + day * 0.28);
    vec3 nightColor = tex * vec3(0.16, 0.20, 0.24);

    vec3 color = mix(nightColor, dayColor, day);

    color += vec3(0.025, 0.085, 0.14) * twilight;

    float rawLights = texture2D(nightLights, uv).r;
    float lights = pow(rawLights, 0.72);
    float visibleLights = lights * night;

    color += vec3(1.0, 0.60, 0.24) * visibleLights * 0.95;
    color += vec3(1.0, 0.86, 0.62) * pow(visibleLights, 2.15) * 0.65;

    float limb = pow(
      1.0 - max(dot(n, viewDir), 0.0),
      3.0
    );

    color += vec3(0.025, 0.09, 0.16) * limb * 0.16;

    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Textured, day/night-shaded Earth. The shader derives UVs from the local
 * position using the canonical globe frame (+Z = 0°,0°), matching
 * coordinates.ts and earthAstronomy.ts — geographic alignment is
 * independent of mesh rotation.
 */
export function Earth({ sunDirection }: { sunDirection?: THREE.Vector3 }) {
  const mesh = useRef<THREE.Mesh>(null);

  const [texture, nightTexture] = useLoader(THREE.TextureLoader, [
    '/earth/earth-surface.jpg',
    '/earth/earth-night-lights-aligned.png',
  ]);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;

    nightTexture.colorSpace = THREE.NoColorSpace;
    nightTexture.anisotropy = 4;
    nightTexture.needsUpdate = true;
  }, [texture, nightTexture]);

  const uniforms = useMemo(
    () => ({
      earthTexture: { value: texture },
      nightLights: { value: nightTexture },
      sunDirection: { value: new THREE.Vector3(0, 0, 1) },
    }),
    [texture, nightTexture],
  );

  const fallbackSun = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!mesh.current) return;

    uniforms.sunDirection.value.copy(
      sunDirection ?? fallbackSun.copy(getSunDirection(new Date())),
    );
  });

  return (
    <mesh ref={mesh} renderOrder={0}>
      <sphereGeometry args={[1, 128, 96]} />

      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthWrite
        depthTest
      />
    </mesh>
  );
}
