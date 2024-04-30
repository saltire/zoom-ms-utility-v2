import { PayloadAction, ThunkAction, UnknownAction, createSlice } from '@reduxjs/toolkit';

import {
  BANK_SELECT_HIGH,
  BANK_SELECT_LOW,
  CONTROL_CHANGE,
  PARAMETER_CHANGE,
  SEND_CURRENT_PATCH,
  UNIVERSAL_GENERAL_INFO,
  decodeBytes,
  getSysexFunction,
} from '../lib/midi';
import { addBytes, range } from '../utils';


export type PortsMap = { [portId: string]: MIDIPort | undefined };

type SliceState = {
  access: MIDIAccess | null,
  ports: PortsMap,
};

const initialState: SliceState = {
  access: null,
  ports: {},
};
type MidiState = { midi: SliceState };

const midiSlice = createSlice({
  name: 'midi',
  initialState,
  reducers: {
    storeAccess: (state, { payload: access }: PayloadAction<MIDIAccess>) => ({ ...state, access }),

    savePort: (state, { payload: port }: PayloadAction<MIDIPort>) => ({
      ...state,
      ...state.ports[port.id] ? {} : { ports: { ...state.ports, [port.id]: port } },
    }),

    removePort: (state, { payload: port }: PayloadAction<MIDIPort>) => ({
      ...state,
      ...state.ports[port.id] ? {
        ports: Object.fromEntries(Object.entries(state.ports).filter(([id]) => id !== port.id)),
      } : {},
    }),
  },
});

export default midiSlice;
export const { storeAccess, savePort, removePort } = midiSlice.actions;

export type Thunk<State = void, ReturnType = void> = ThunkAction<
ReturnType, State, unknown, UnknownAction>;

const accessPromise = 'requestMIDIAccess' in navigator
  ? navigator.requestMIDIAccess({ sysex: true })
  : Promise.reject(new Error('WebMIDI access not available.'));

export const initialize = (): Thunk<MidiState> => dispatch => {
  accessPromise
    .then(access => {
      // console.log('Access:', access);
      // dispatch(storeAccess(access));

      const handleMessage = (event: Event) => {
        // console.log('Event:', event);

        const { data } = event as MIDIMessageEvent;
        // const targetId = (target as MIDIPort).id;

        const sysexResult = getSysexFunction(data);
        if (sysexResult) {
          const { func, subfunc, data: sysexData } = sysexResult;

          if (func === UNIVERSAL_GENERAL_INFO) {
            const [zoomId, deviceId, , , , ...versionBytes] = sysexData;
            const version = String.fromCharCode(...versionBytes);
            console.log(`Manufacturer ID ${zoomId.toString(16)}, device ID ${deviceId.toString(16)}, firmware version ${version}`);
          }
          else if (func === SEND_CURRENT_PATCH) {
            console.log('Current patch:', [...sysexData]);
            console.log(decodeBytes(sysexData));
            const bytes = decodeBytes(sysexData);
            range(6).forEach(e => {
              const eb = bytes.slice(e * 18, (e + 1) * 18);
              const params = range(8).map(p => addBytes(eb[p * 2 + 1], eb[p * 2 + 2]));
              console.log(`Effect ${e + 1} params: ${params.join(', ')}`);
            });
          }
          else if (func === PARAMETER_CHANGE) {
            const [effect, param, valueLow, valueHigh] = sysexData;
            const value = addBytes(valueLow, valueHigh);
            if (param === 0) {
              console.log(`Effect ${effect + 1}:`, value ? 'on' : 'off');
            }
            else {
              console.log(`Effect ${effect + 1}, parameter ${param - 1}:`, value);
            }
          }
          else {
            console.log('Sysex:', func, subfunc, [...sysexData]);
          }
        }
        else {
          const [status, code, value] = data;
          const messageType = status >>> 4;
          const channel = status & 0b00001111;

          if (messageType === CONTROL_CHANGE) {
            if (code === BANK_SELECT_HIGH) {
              console.log('Bank select (high):', value);
              // dispatch(updateBank({ high: value }));
            }
            else if (code === BANK_SELECT_LOW) {
              console.log('Bank select (low):', value);
              // dispatch(updateBank({ low: value }));
            }
          }

          //   const [parameter, translated] = messageToParameter(code, value);
          //   if (parameter !== undefined && translated !== undefined) {
          //     console.log({ parameter: paramData[parameter].title, value: translated });

          //     dispatch(setPanelParameter({ parameter, value: translated }));
          //   }
          // }
          // else if (messageType === PROGRAM_CHANGE) {
          //   const { midi: { deviceBank } } = getState();
          //   dispatch(setProgram(code));

          //   const index = (deviceBank ?? 0) * 100 + code;
          //   console.log({ program: index + 1 });

          //   // const output = getOutputPort(ports);
          //   // if (output) {
          //   //   requestProgram(output, index);
          //   // }
          // }
          else {
            console.log('Message:', { messageType, channel, code, value });
          }

          // dispatch(receiveMessage({
          //   targetId, messageType, channel, code, value, timeStamp,
          // }));
        }
      };

      access.inputs.forEach(input => {
        // console.log({ input });
        dispatch(savePort(input));
        input.addEventListener('midimessage', handleMessage);
      });

      access.outputs.forEach(output => {
        // console.log({ output });
        dispatch(savePort(output));
      });

      access.addEventListener('statechange', event => {
        // console.log('statechange', event);

        const { port } = event as MIDIConnectionEvent;
        if (port.state === 'connected') {
          dispatch(savePort(port));
          if (port.type === 'input') {
            port.addEventListener('midimessage', handleMessage);
          }
        }
        else {
          dispatch(removePort(port));
        }
      });
    })
    .catch(console.error);
};
