import { AdditiveBlending, BackSide } from 'three';

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -p.xyz;
    gl_Position = projectionMatrix * p;
  }
`;

const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vView);

    // d: 0 at the shell's outer silhouette, 1 looking through its center.
    // Alpha rises smoothly from 0 at the hard outer edge, peaks just inside
    // the limb, and decays to ~0 inward — a gradient, never a border.
    float d = abs(dot(normal, viewDir));

    float rise = smoothstep(0.0, 0.22, d);
    float fall = 1.0 - smoothstep(0.38, 0.95, d);

    vec3 haze = vec3(0.30, 0.52, 0.78);

    gl_FragColor = vec4(haze, rise * fall * 0.27);
  }
`;

export function Atmosphere() {
  return (
    <mesh scale={1.06} renderOrder={3}>
      <sphereGeometry args={[1, 96, 64]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        depthTest
        side={BackSide}
        blending={AdditiveBlending}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
