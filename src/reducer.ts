import { combineReducers, ThunkAction, UnknownAction } from '@reduxjs/toolkit';

import midiSlice from './slices/midiSlice';


export const rootReducer = combineReducers({
  midi: midiSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export type Thunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, UnknownAction>;
