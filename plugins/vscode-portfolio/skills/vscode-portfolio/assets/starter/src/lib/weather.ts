import { create } from "zustand";

/**
 * The README's weather, an easter egg driven by high fives with the greeting's hand
 * (see HighFiveHand): rain after RAIN_AT of them, winter after SNOW_AT. And at SHUTDOWN_AT the whole
 * site "shuts down" (see Shutdown); restarting it resets the high fives, and with them the weather.
 */
export type Weather = "clear" | "rain" | "snow";

/** The site's pretend power: on; powering off (the screen collapsing); off; booting; warming back on. */
export type Power = "on" | "shutting-down" | "off" | "booting" | "waking";

export const RAIN_AT = 5;
export const SNOW_AT = 10;
export const SHUTDOWN_AT = 15;

const weatherFor = (highFives: number): Weather =>
  highFives >= SNOW_AT ? "snow" : highFives >= RAIN_AT ? "rain" : "clear";

type WeatherState = {
  highFives: number;
  weather: Weather;
  power: Power;
  /** Counts a high five and returns the new total. */
  highFive: () => number;
  setPower: (power: Power) => void;
  /** Restarts after the shutdown: boots with the high fives (and the weather) reset. */
  reboot: () => void;
};

export const useWeather = create<WeatherState>((set, get) => ({
  highFives: 0,
  weather: "clear",
  power: "on",
  highFive: () => {
    const highFives = get().highFives + 1;
    set({ highFives, weather: weatherFor(highFives), ...(highFives === SHUTDOWN_AT && { power: "shutting-down" }) });
    return highFives;
  },
  setPower: (power) => set({ power }),
  reboot: () => set({ highFives: 0, weather: "clear", power: "booting" }),
}));
