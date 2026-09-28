export type RenderMode = 'skin' | 'blueprint' | 'xray' | 'micro_anatomy';

export type FlightMode = 'stationary' | 'flight_path';

export type CameraFollowMode = 'orbit' | 'chase' | 'cockpit';

export interface MechanicalComponent {
  id: string;
  name: string;
  category: 'skeleton' | 'gear_train' | 'wings' | 'hydraulics' | 'cranial' | 'empennage' | 'talons' | 'wiring';
  anatomicalLayer: 'armor' | 'musculature' | 'skeleton' | 'core_power' | 'micro_wiring';
  material: string;
  jewelCount?: number;
  gearRatio?: string;
  tolerance: string;
  weightGrams?: number;
  description: string;
  explodeDirection: [number, number, number];
  explodeDistance: number;
}

export interface TelemetryData {
  airspeedKnots: number;
  altitudeMeters: number;
  wingBeatFrequencyHz: number;
  powerReserveHours: number;
  escapementVph: number;
  pitchDegrees: number;
  rollDegrees: number;
  zoomLevel: number;
  lodQuality: 'Macro 4K' | 'High' | 'Standard';
}
