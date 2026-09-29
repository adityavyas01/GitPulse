import { Sphere, Vector3 } from 'three';

/**
 * Fixed raycast bounding sphere for the activity InstancedMesh.
 *
 * three's InstancedMesh.raycast() lazily builds `boundingSphere` from the
 * instance matrices the FIRST time it runs and never rebuilds it. Instances
 * start as zero matrices (data arrives later), so a pointer move before the
 * first data load cached an empty sphere and every later hover missed.
 *
 * Every instance lies on the globe shell (radius 1.014) and its quad is at
 * most 0.13 wide (half-diagonal ~0.092), so the outermost extent is ~1.106.
 * A fixed sphere at the origin therefore always encloses all instances.
 */
export const ACTIVITY_HIT_RADIUS = 1.25;

export function createActivityHitSphere(): Sphere {
  return new Sphere(new Vector3(0, 0, 0), ACTIVITY_HIT_RADIUS);
}