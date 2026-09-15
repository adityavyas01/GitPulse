import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Spherical, Vector3 } from 'three';

import { isCoordinate, latLonToVector3 } from './coordinates.js';

const FLIGHT_ALTITUDE = 1.95;
const STOP_EPSILON = 0.004;

/** Registered by GlobeCanvas so flights track the rotating Earth group. */
export const flyToEarthGroup: { current: Group | null } = { current: null };

interface Props {
  target: { latitude: number; longitude: number; seq: number } | null;
  /** Bumped by GlobeCanvas when the user drags the globe — aborts the flight. */
  onUserInteract?: () => void;
  /** Incremented by GlobeCanvas when the user manually moves the camera. */
  cancelRevision?: number;
}

/**
 * Week 11 (UI_SPEC §7) semantics with the prototype flight model: the
 * camera eases toward a position above the location, tracking the rotating
 * Earth group so the destination never drifts. Consumed once close.
 */
export function CameraFlyTo({ target, cancelRevision = -1 }: Props) {
  const flight = useRef(false);
  const flightRevision = useRef(-1);
  const scratch = useMemo(
    () => ({
      local: new Vector3(),
      world: new Vector3(),
      current: new Spherical(),
      target: new Spherical(),
    }),
    [],
  );

  useEffect(() => {
    flight.current = Boolean(
      target && isCoordinate(target.latitude, target.longitude),
    );
    flightRevision.current = target ? target.seq : -1;
    if (target && flight.current) {
      latLonToVector3(target.latitude, target.longitude, scratch.local);
    }
  }, [target, scratch]);

  useFrame(({ camera }, delta) => {
    if (!flight.current) return;
    if (cancelRevision >= 0 && cancelRevision === flightRevision.current + 1) {
      flight.current = false;
      return;
    }

    const earth = flyToEarthGroup.current;
    if (!earth) return;

    earth.updateWorldMatrix(true, false);
    scratch.world.copy(scratch.local);
    earth.localToWorld(scratch.world);
    scratch.target.setFromVector3(scratch.world);
    scratch.current.setFromVector3(camera.position);

    const alpha = 1 - Math.exp(-3.2 * delta);
    const angle = Math.atan2(
      Math.sin(scratch.target.theta - scratch.current.theta),
      Math.cos(scratch.target.theta - scratch.current.theta),
    );
    scratch.current.theta += angle * alpha;
    scratch.current.phi += (scratch.target.phi - scratch.current.phi) * alpha;
    scratch.current.radius += (FLIGHT_ALTITUDE - scratch.current.radius) * alpha;
    scratch.current.makeSafe();
    camera.position.setFromSpherical(scratch.current);
    camera.lookAt(0, 0, 0);

    if (
      Math.abs(angle) < STOP_EPSILON &&
      Math.abs(scratch.target.phi - scratch.current.phi) < STOP_EPSILON &&
      Math.abs(scratch.current.radius - FLIGHT_ALTITUDE) < STOP_EPSILON
    ) {
      flight.current = false;
    }
  });

  return null;
}
