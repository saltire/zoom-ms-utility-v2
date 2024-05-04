import { range } from '../utils';

const SYSEX_START = 0xf0;
const SYSEX_END = 0xf7;

const ZOOM_ID = 0x52;
const DEVICE_ID = 0x58;
const UNIVERSAL_ID = 0x7e;

// Sysex functions
export const UNIVERSAL_GENERAL_INFO = 0x06;
export const SEND_PATCH = 0x08;
export const REQUEST_PATCH = 0x09; // [? 0, ? 0, patch 0-49]
export const SEND_CURRENT_PATCH = 0x28;
export const REQUEST_CURRENT_PATCH = 0x29;
export const PARAMETER_CHANGE = 0x31; // [effect 0-5, param 0-10, value low, value high]
export const STORE_PATCH = 0x32; // [? 1, ? 0, ? 0, patch 0-49, ? 0, ? 0, ? 0, ? 0, ? 0]
export const REQUEST_CURRENT_PROGRAM = 0x33;
export const ENABLE_PARAMETER_CHANGE = 0x50;
export const DISABLE_PARAMETER_CHANGE = 0x51;

// MIDI messages
export const CONTROL_CHANGE = 0xb;
export const PROGRAM_CHANGE = 0xc;
export const CLOCK = 0xf;

export const BANK_SELECT_HIGH = 0x0;
export const BANK_SELECT_LOW = 0x20;

export const requestInfo = (output: MIDIOutput) => {
  // Universal system message: no zoom header
  output.send([SYSEX_START, UNIVERSAL_ID, 0x00, UNIVERSAL_GENERAL_INFO, 0x01, SYSEX_END]);
};

const buildMessage = (data?: number[] | Uint8Array) => [
  SYSEX_START, ZOOM_ID, 0x00, DEVICE_ID, ...data ?? [], SYSEX_END,
];

export const sendSysexFunction = (
  output: MIDIOutput, func: number, data?: number[] | Uint8Array,
) => {
  output.send(buildMessage([func, ...data ?? []]));
};

type SysexResult = {
  func: number,
  subfunc?: number,
  data: Uint8Array,
};

export const getSysexFunction = (data: Uint8Array): SysexResult | null => {
  if (
    data[0] === SYSEX_START
    && data[1] === ZOOM_ID
    && data[2] === 0x00
    && data[3] === DEVICE_ID
  ) {
    return { func: data[4], data: data.slice(5, data.length - 1) };
  }

  if (
    data[0] === SYSEX_START
    && data[1] === UNIVERSAL_ID
    && data[2] === 0x00
  ) {
    return { func: data[3], subfunc: data[4], data: data.slice(5, data.length - 1) };
  }

  return null;
};

// Sysex messages only support byte values up to 127 (the lower 7 bits).
// For every 8 bytes, the first byte's lower 7 bits represent whether to add 128 to each of
// the next 7 bytes, allowing them to have values up to 255.
// E.g. if byte 1 is 0x01001000, add 128 to bytes 2 and 5. Then discard byte 1.
export const decodeBytes = (data: Uint8Array) => {
  const values: number[] = [];
  for (let x = 0; x < data.length; x += 8) {
    const [bits, ...bytes] = data.slice(x, x + 8);
    values.push(...bytes.map((byte, i) => byte | (((bits >>> (6 - i)) & 0x1) << 7)));
  }
  return values;
};

const parseEffect = (data: number[] | Uint8Array) => ({
  category: (data[3] >>> 1) & 0b1111,
  type: (data[0] >>> 5) | ((data[1] & 0b1111) << 3),
  enabled: !!(data[0] & 0b1),
  params: [
    (data[3] >>> 5) | (data[4] << 3) | ((data[5] & 0b11) << 11),
    (data[5] >>> 2) | ((data[6] & 0b1111111) << 6),
    (data[6] >>> 7) | (data[7] << 1) | ((data[8] & 0b1111) << 9),
    (data[8] >>> 4) | ((data[9] & 0b1111) << 4),
    (data[9] >>> 4) | ((data[10] & 0b1111) << 4),
    (data[10] >>> 4) | ((data[11] & 0b1111) << 4),
    (data[11] >>> 4) | ((data[12] & 0b1111) << 4),
    (data[12] >>> 4) | ((data[13] & 0b1111) << 4),
    data[16],
  ],
});

export const parsePatch = (data: number[] | Uint8Array) => {
  const effectCount = (data[109] >>> 2) & 0b111;
  const effects = range(effectCount).map(e => ({
    ...parseEffect(data.slice(e * 18, (e + 1) * 18)),
    ...(data[108] >>> e) & 0b1 ? { dspFull: true } : {},
  }));

  return {
    name: String.fromCharCode(...data.slice(111, 121)).trim(),
    currentEffect: 5 - ((data[108] >>> 6) | (data[109] & 0b1)),
    tempo: (data[109] >>> 5) | ((data[110] & 0b11111) << 3),
    effects,
  };
};
