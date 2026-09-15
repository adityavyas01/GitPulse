import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, FrontSide, Mesh } from 'three';

const vertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vPosition = normalize(position);
    vNormal = normalize(normalMatrix * normal);

    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
  }
`;

const fragmentShader = `
  uniform float time;

  varying vec3 vPosition;
  varying vec3 vNormal;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.5);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    float lon = atan(vPosition.x, vPosition.z);
    float lat = asin(clamp(vPosition.y, -1.0, 1.0));

    vec2 uv = vec2(
      lon / 6.2831853 + 0.5,
      lat / 3.14159265 + 0.5
    );

    uv.x += time * 0.0025;

    float n = noise(uv * vec2(7.0, 4.0));
    n = n * 0.65 + noise(uv * vec2(15.0, 8.0)) * 0.35;

    float cloud = smoothstep(0.56, 0.72, n);

    // Clouds are most visible near the limb and only lightly over the surface.
    float view = abs(vNormal.z);
    float alpha = cloud * (0.035 + (1.0 - view) * 0.055);

    gl_FragColor = vec4(vec3(0.82, 0.91, 0.95), alpha);
  }
`;

export function CloudLayer() {
  const mesh = useRef<Mesh>(null);

  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);

  useFrame((_, delta) => {
    uniforms.time.value += delta;
  });

  return (
    <mesh ref={mesh} scale={1.012} renderOrder={2} rotation={[0.08, 0.35, -0.03]}>
      <sphereGeometry args={[1, 96, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest
        side={FrontSide}
        blending={AdditiveBlending}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
