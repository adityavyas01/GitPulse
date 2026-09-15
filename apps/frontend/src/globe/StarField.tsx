// // import { useMemo } from 'react';
// // import * as THREE from 'three';

// // const STAR_COUNT = 7000;

// // function seededRandom(seed: number) {
// //   let value = seed;
// //   return () => {
// //     value = (value * 1664525 + 1013904223) >>> 0;
// //     return value / 4294967296;
// //   };
// // }

// // const vertexShader = `
// //   attribute float starSize;
// //   attribute float starBrightness;

// //   varying float vBrightness;

// //   void main() {
// //     vBrightness = starBrightness;

// //     vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

// //     gl_PointSize = starSize * (300.0 / -mvPosition.z);

// //     gl_Position = projectionMatrix * mvPosition;
// //   }
// // `;

// // const fragmentShader = `
// //   varying float vBrightness;

// //   void main() {
// //     vec2 uv = gl_PointCoord - vec2(0.5);
// //     float distance = length(uv);

// //     if (distance > 0.5) discard;

// //     float core = 1.0 - smoothstep(0.0, 0.13, distance);
// //     float glow = 1.0 - smoothstep(0.08, 0.5, distance);

// //     float alpha = core * 0.95 + glow * 0.18;
// //     alpha *= vBrightness;

// //     if (alpha < 0.008) discard;

// //     gl_FragColor = vec4(
// //       0.88 + vBrightness * 0.12,
// //       0.92 + vBrightness * 0.08,
// //       1.0,
// //       alpha
// //     );
// //   }
// // `;

// // export function StarField() {
// //   const { positions, colors, sizes, brightness } = useMemo(() => {
// //     const random = seededRandom(731927);

// //     const positions = new Float32Array(STAR_COUNT * 3);
// //     const colors = new Float32Array(STAR_COUNT * 3);
// //     const sizes = new Float32Array(STAR_COUNT);
// //     const brightness = new Float32Array(STAR_COUNT);

// //     for (let i = 0; i < STAR_COUNT; i++) {
// //       // Most stars uniform; a portion concentrated toward a broad tilted
// //       // galactic plane for a subtle Milky Way-like band.
// //       const galacticStar = random() < 0.42;

// //       let y: number;

// //       if (galacticStar) {
// //         const band = (random() + random() + random()) / 3;
// //         y = (band - 0.5) * 0.72;
// //       } else {
// //         y = random() * 2 - 1;
// //       }

// //       const angle = random() * Math.PI * 2;
// //       const radial = Math.sqrt(Math.max(0, 1 - y * y));

// //       // Multiple depth layers give the field a sense of depth.
// //       const layer = random();
// //       let radius: number;
// //       if (layer < 0.55) radius = 45 + random() * 35;
// //       else if (layer < 0.88) radius = 80 + random() * 60;
// //       else radius = 140 + random() * 100;

// //       positions.set([Math.cos(angle) * radial * radius, y * radius, Math.sin(angle) * radial * radius], i * 3);

// //       const starBrightness = Math.pow(random(), 3.4);
// //       brightness[i] = 0.18 + starBrightness * 0.82;

// //       const temperature = random();
// //       colors.set(
// //         [
// //           (0.78 + temperature * 0.22) * brightness[i],
// //           (0.84 + temperature * 0.16) * brightness[i],
// //           brightness[i],
// //         ],
// //         i * 3,
// //       );

// //       const sizeRoll = random();
// //       if (sizeRoll > 0.995) sizes[i] = 2.8 + random() * 1.8;
// //       else if (sizeRoll > 0.96) sizes[i] = 1.8 + random() * 0.9;
// //       else sizes[i] = 0.7 + random() * 0.65;
// //     }

// //     return { positions, colors, sizes, brightness };
// //   }, []);

// //   return (
// //     <points frustumCulled={false}>
// //       <bufferGeometry>
// //         <bufferAttribute attach="attributes-position" args={[positions, 3]} />
// //         <bufferAttribute attach="attributes-color" args={[colors, 3]} />
// //         <bufferAttribute attach="attributes-starSize" args={[sizes, 1]} />
// //         <bufferAttribute attach="attributes-starBrightness" args={[brightness, 1]} />
// //       </bufferGeometry>

// //       <shaderMaterial
// //         vertexShader={vertexShader}
// //         fragmentShader={fragmentShader}
// //         transparent
// //         depthWrite={false}
// //         depthTest
// //         blending={THREE.AdditiveBlending}
// //         vertexColors
// //       />
// //     </points>
// //   );
// // }

// import { useMemo } from 'react';
// import { useLoader } from '@react-three/fiber';
// import * as THREE from 'three';

// const STAR_COUNT = 0;

// function seededRandom(seed: number) {
//   let value = seed;
//   return () => {
//     value = (value * 1664525 + 1013904223) >>> 0;
//     return value / 4294967296;
//   };
// }

// const vertexShader = `
//   attribute float starSize;
//   attribute float starBrightness;

//   varying float vBrightness;

//   void main() {
//     vBrightness = starBrightness;

//     vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

//     gl_PointSize = starSize * (300.0 / -mvPosition.z);

//     gl_Position = projectionMatrix * mvPosition;
//   }
// `;

// const fragmentShader = `
//   varying float vBrightness;

//   void main() {
//     vec2 uv = gl_PointCoord - vec2(0.5);
//     float distance = length(uv);

//     if (distance > 0.5) discard;

//     float core = 1.0 - smoothstep(0.0, 0.13, distance);
//     float glow = 1.0 - smoothstep(0.08, 0.5, distance);

//     float alpha = core * 0.95 + glow * 0.18;
//     alpha *= vBrightness;

//     if (alpha < 0.008) discard;

//     gl_FragColor = vec4(
//       0.88 + vBrightness * 0.12,
//       0.92 + vBrightness * 0.08,
//       1.0,
//       alpha
//     );
//   }
// `;

// export function StarField() {
//   const galaxyTexture = useLoader(
//     THREE.TextureLoader,
//     '/space/main.jpg'
//   );

//   galaxyTexture.colorSpace = THREE.SRGBColorSpace;
//   galaxyTexture.anisotropy = 4;
//   galaxyTexture.minFilter = THREE.LinearFilter;
//   galaxyTexture.magFilter = THREE.LinearFilter;

//   const { positions, colors, sizes, brightness } = useMemo(() => {
//     const random = seededRandom(731927);

//     const positions = new Float32Array(STAR_COUNT * 3);
//     const colors = new Float32Array(STAR_COUNT * 3);
//     const sizes = new Float32Array(STAR_COUNT);
//     const brightness = new Float32Array(STAR_COUNT);

//     for (let i = 0; i < STAR_COUNT; i++) {
//       // Most stars uniform; a portion concentrated toward a broad tilted
//       // galactic plane for a subtle Milky Way-like band.
//       const galacticStar = random() < 0.42;

//       let y: number;

//       if (galacticStar) {
//         const band = (random() + random() + random()) / 3;
//         y = (band - 0.5) * 0.72;
//       } else {
//         y = random() * 2 - 1;
//       }

//       const angle = random() * Math.PI * 2;
//       const radial = Math.sqrt(Math.max(0, 1 - y * y));

//       // Multiple depth layers give the field a sense of depth.
//       const layer = random();

//       let radius: number;

//       if (layer < 0.55) {
//         radius = 45 + random() * 35;
//       } else if (layer < 0.88) {
//         radius = 80 + random() * 60;
//       } else {
//         radius = 140 + random() * 100;
//       }

//       positions.set(
//         [
//           Math.cos(angle) * radial * radius,
//           y * radius,
//           Math.sin(angle) * radial * radius,
//         ],
//         i * 3
//       );

//       const starBrightness = Math.pow(random(), 3.4);
//       brightness[i] = 0.18 + starBrightness * 0.82;

//       const temperature = random();

//       colors.set(
//         [
//           (0.78 + temperature * 0.22) * brightness[i],
//           (0.84 + temperature * 0.16) * brightness[i],
//           brightness[i],
//         ],
//         i * 3
//       );

//       const sizeRoll = random();

//       if (sizeRoll > 0.995) {
//         sizes[i] = 2.8 + random() * 1.8;
//       } else if (sizeRoll > 0.96) {
//         sizes[i] = 1.8 + random() * 0.9;
//       } else {
//         sizes[i] = 0.7 + random() * 0.65;
//       }
//     }

//     return {
//       positions,
//       colors,
//       sizes,
//       brightness,
//     };
//   }, []);

//   return (
//     <>
//       {/* Photographic deep-space background */}
//       <mesh
//         scale={[-1, 1, 1]}
//         frustumCulled={false}
//         renderOrder={-10}
//       >
//         <sphereGeometry args={[80, 64, 32]} />

//         <meshBasicMaterial
//           map={galaxyTexture}
//           side={THREE.BackSide}
//           depthWrite={false}
//           depthTest={false}
//           toneMapped={false}
//         />
//       </mesh>

//       {/* Original Git Pulse procedural stars */}
//       <points
//         frustumCulled={false}
//         renderOrder={-5}
//       >
//         <bufferGeometry>
//           <bufferAttribute
//             attach="attributes-position"
//             args={[positions, 3]}
//           />

//           <bufferAttribute
//             attach="attributes-color"
//             args={[colors, 3]}
//           />

//           <bufferAttribute
//             attach="attributes-starSize"
//             args={[sizes, 1]}
//           />

//           <bufferAttribute
//             attach="attributes-starBrightness"
//             args={[brightness, 1]}
//           />
//         </bufferGeometry>

//         <shaderMaterial
//           vertexShader={vertexShader}
//           fragmentShader={fragmentShader}
//           transparent
//           depthWrite={false}
//           depthTest
//           blending={THREE.AdditiveBlending}
//           vertexColors
//         />
//       </points>
//     </>
//   );
// }

import { useMemo } from 'react';
import * as THREE from 'three';

const STAR_COUNT = 7000;
const SKY_RADIUS = 50;

function seededRandom(seed: number) {
  let value = seed;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const vertexShader = `
  attribute float starSize;
  attribute float starBrightness;

  varying float vBrightness;

  void main() {
    vBrightness = starBrightness;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    gl_PointSize = starSize * (300.0 / -mvPosition.z);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying float vBrightness;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float distance = length(uv);

    if (distance > 0.5) discard;

    float core = 1.0 - smoothstep(0.0, 0.13, distance);
    float glow = 1.0 - smoothstep(0.08, 0.5, distance);

    float alpha = core * 0.95 + glow * 0.18;

    alpha *= vBrightness;

    if (alpha < 0.008) discard;

    gl_FragColor = vec4(
      0.88 + vBrightness * 0.12,
      0.92 + vBrightness * 0.08,
      1.0,
      alpha
    );
  }
`;

export function StarField() {
  const {
    positions,
    sizes,
    brightness
  } = useMemo(() => {
    const random = seededRandom(731927);

    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const brightness = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const galacticStar = random() < 0.42;

      let y: number;

      if (galacticStar) {
        const band = (random() + random() + random()) / 3;
        y = (band - 0.5) * 0.72;
      } else {
        y = random() * 2 - 1;
      }

      const angle = random() * Math.PI * 2;
      const radial = Math.sqrt(Math.max(0, 1 - y * y));
      const layer = random();

      let radius: number;

      if (layer < 0.55) {
        radius = 45 + random() * 35;
      } else if (layer < 0.88) {
        radius = 80 + random() * 60;
      } else {
        radius = 140 + random() * 100;
      }

      const x = Math.cos(angle) * radial * radius;
      const z = Math.sin(angle) * radial * radius;

      positions.set(
        [x, y * radius, z],
        i * 3
      );

      const starBrightness = Math.pow(random(), 3.4);

      brightness[i] = 0.18 + starBrightness * 0.82;

      const sizeRoll = random();

      if (sizeRoll > 0.995) {
        sizes[i] = 2.8 + random() * 1.8;
      } else if (sizeRoll > 0.96) {
        sizes[i] = 1.8 + random() * 0.9;
      } else {
        sizes[i] = 0.7 + random() * 0.65;
      }
    }

    return {
      positions,
      sizes,
      brightness
    };
  }, []);

  return (
    <>
      {/* Real Milky Way / astronomical background */}
      <SkyMap />

      {/* Original Git Pulse procedural stars */}
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />

          <bufferAttribute
            attach="attributes-starSize"
            args={[sizes, 1]}
          />

          <bufferAttribute
            attach="attributes-starBrightness"
            args={[brightness, 1]}
          />
        </bufferGeometry>

        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          depthTest={true}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}

function SkyMap() {
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const map = loader.load('/space/main.jpg');

    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 2;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.magFilter = THREE.LinearFilter;

    return map;
  }, []);

  return (
    <mesh
      renderOrder={-10}
      frustumCulled={false}
    >
      <sphereGeometry args={[SKY_RADIUS, 64, 32]} />

      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}