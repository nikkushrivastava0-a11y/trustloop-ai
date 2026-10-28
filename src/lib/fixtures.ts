import type { Resource, ResourcePresentation, Booking } from "./types";
export const resources: Resource[] = [
  {
    id: "camera",
    title: "Sony Alpha A7 IV",
    category: "Photography",
    description:
      "Bring your next story into focus. A full-frame mirrorless camera with a 28–70mm lens, two batteries and a protective carry case.",
    location: "Media Lab · Block A",
    rules: [
      "Carry your campus ID at pickup.",
      "Return the lens, batteries and case together.",
      "Indoor and supervised campus use only.",
    ],
    requires_training: false,
    available: true,
  },
  {
    id: "printer",
    title: "Ultimaker S3 3D Printer",
    category: "Fabrication",
    description:
      "Turn your CAD model into a working prototype with precision dual-extrusion printing. PLA filament is available at the makerspace.",
    location: "Makerspace · Block C",
    rules: [
      "Complete makerspace safety training.",
      "Use approved PLA filament only.",
      "Clean the build plate after your session.",
    ],
    requires_training: true,
    available: true,
  },
  {
    id: "vr",
    title: "Meta Quest 3",
    category: "Electronics",
    description:
      "Explore spatial computing, immersive learning and interactive design with a standalone mixed reality headset.",
    location: "Innovation Hub · Block B",
    rules: [
      "Clean the facial interface after use.",
      "Use the wrist straps and a clear play area.",
      "Return both controllers and charging cable.",
    ],
    requires_training: false,
    available: true,
  },
  {
    id: "scope",
    title: "Digital Oscilloscope",
    category: "Electronics",
    description:
      "Measure, debug and understand your circuit with a four-channel digital oscilloscope and a full set of probes.",
    location: "Electronics Lab · Block D",
    rules: [
      "Electrical lab training is required.",
      "Do not exceed rated input voltage.",
      "Check probes before connecting.",
    ],
    requires_training: true,
    available: true,
  },
  {
    id: "projector",
    title: "Epson Full HD Projector",
    category: "Presentation",
    description:
      "A portable full HD projector for student workshops, presentations and screenings. HDMI cable and remote included.",
    location: "Student Centre · Block A",
    rules: [
      "Allow the unit to cool before packing.",
      "Keep the lens cap and remote in the case.",
    ],
    requires_training: false,
    available: false,
  },
  {
    id: "audio",
    title: "RØDE Podcast Studio",
    category: "Audio",
    description:
      "Record your next big conversation with two studio microphones, headphones and a compact audio interface.",
    location: "Media Lab · Block A",
    rules: [
      "Use pop filters during recordings.",
      "Leave the studio as you found it.",
    ],
    requires_training: false,
    available: true,
  },
];
export const presentation: Record<string, ResourcePresentation> = {
  camera: {
    image: "/equipment/camera.svg",
    label: "Creator essentials",
    accent: "peach",
  },
  printer: {
    image: "/equipment/printer.svg",
    label: "Build something real",
    accent: "sage",
  },
  vr: {
    image: "/equipment/vr.svg",
    label: "Beyond the screen",
    accent: "lavender",
  },
  scope: {
    image: "/equipment/scope.svg",
    label: "For curious minds",
    accent: "blue",
  },
  projector: {
    image: "/equipment/projector.svg",
    label: "Ideas on the big screen",
    accent: "sand",
  },
  audio: {
    image: "/equipment/audio.svg",
    label: "Find your voice",
    accent: "rose",
  },
};
export const seedBookings: Booking[] = [
  {
    id: "TL-1042",
    resource_id: "camera",
    starts_at: "2030-11-02T04:30:00.000Z",
    ends_at: "2030-11-02T07:30:00.000Z",
    purpose: "Photography club campus documentary",
    status: "requested",
    student_id: "demo-student",
    student_name: "Alex Morgan",
  },
];
