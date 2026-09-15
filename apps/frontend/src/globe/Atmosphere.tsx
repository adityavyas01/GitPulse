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

    float rim = 1.0 - max(dot(normal, viewDir), 0.0);
    rim = pow(rim, 3.6);

    float inner = pow(rim, 1.8) * 0.26;
    float outer = pow(rim, 5.0) * 0.68;

    vec3 blue = vec3(0.10, 0.43, 0.82);
    vec3 cyan = vec3(0.18, 0.68, 1.0);

    vec3 color = mix(blue, cyan, outer);
    float alpha = inner + outer;

    gl_FragColor = vec4(color, alpha * 0.42);
  }
`;

export function Atmosphere() {
  return (
    <mesh scale={1.035} renderOrder={3}>
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
