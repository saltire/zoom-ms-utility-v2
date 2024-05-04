import { useEffect, useMemo } from 'react';

import './App.css';
import { useAppDispatch, useAppSelector } from '../store';
import { initialize } from '../slices/midiSlice';
import Ports from './Ports';
import { ENABLE_PARAMETER_CHANGE, sendSysexFunction } from '../lib/midi';


export default function App() {
  const dispatch = useAppDispatch();
  const ports = useAppSelector(({ midi }) => midi.ports);

  useEffect(() => {
    dispatch(initialize());
  }, []);

  const output = useMemo(
    () => Object.values(ports)
      .filter((port: MIDIPort | undefined): port is MIDIOutput => port?.type === 'output')
      .find(Boolean),
    [ports]);

  useEffect(() => {
    if (output) {
      sendSysexFunction(output, ENABLE_PARAMETER_CHANGE);
    }
  }, [output]);

  return (
    <div className='App'>
      <header>
        <h1>MS-50G Utility</h1>
      </header>

      <main />

      <footer>
        <Ports />
      </footer>
    </div>
  );
}
