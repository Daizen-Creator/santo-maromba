/// <reference types="vite/client" />
import { FitTrackAPI } from '../preload/index';

declare global {
  interface Window {
    fitTrackAPI: FitTrackAPI;
  }
}
