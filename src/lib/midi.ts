const SYSEX_START = 0xf0;
const SYSEX_END = 0xf7;

const ZOOM_ID = 0x52;
const DEVICE_ID = 0x58;
const UNIVERSAL_ID = 0x7e;

// Sysex functions
export const UNIVERSAL_GENERAL_INFO = 0x06;
export const SEND_CURRENT_PATCH = 0x28;
export const REQUEST_CURRENT_PATCH = 0x29;
export const PARAMETER_CHANGE = 0x31;
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

export const decodeBytes = (data: Uint8Array) => {
  const values: number[] = [];
  for (let x = 0; x < data.length; x += 8) {
    const [bits, ...bytes] = data.slice(x, x + 8);
    values.push(...bytes.map((byte, i) => byte | (((bits >>> (6 - i)) & 0x1) << 7)));
  }
  return values;
};
