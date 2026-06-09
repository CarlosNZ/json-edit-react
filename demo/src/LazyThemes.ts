import { Theme } from '@json-edit-react'
import {
  githubDarkTheme,
  githubLightTheme,
  monoLightTheme,
  monoDarkTheme,
  candyWrapperTheme,
  psychedelicTheme,
  solarizedDarkTheme,
  solarizedLightTheme,
  draculaTheme,
  monokaiTheme,
  tokyoNightTheme,
} from '@json-edit-react/themes'

// This file contains functions that return theme objects
// Each function is dynamically imported when needed to reduce initial bundle
// size

export const getGithubDarkTheme = (): Theme => githubDarkTheme
export const getGithubLightTheme = (): Theme => githubLightTheme
export const getWhiteBlackTheme = (): Theme => monoLightTheme
export const getBlackWhiteTheme = (): Theme => monoDarkTheme
export const getCandyWrapperTheme = (): Theme => candyWrapperTheme
export const getPsychedelicTheme = (): Theme => psychedelicTheme
export const getSolarizedDarkTheme = (): Theme => solarizedDarkTheme
export const getSolarizedLightTheme = (): Theme => solarizedLightTheme
export const getDraculaTheme = (): Theme => draculaTheme
export const getMonokaiTheme = (): Theme => monokaiTheme
export const getTokyoNightTheme = (): Theme => tokyoNightTheme

// Allow dynamic accessing of theme getter functions
interface ThemeGetters {
  [key: string]: () => Theme
}

// Export a map for safer dynamic access
export const themeGetters: ThemeGetters = {
  getGithubDarkTheme,
  getGithubLightTheme,
  getWhiteBlackTheme,
  getBlackWhiteTheme,
  getCandyWrapperTheme,
  getPsychedelicTheme,
  getSolarizedDarkTheme,
  getSolarizedLightTheme,
  getDraculaTheme,
  getMonokaiTheme,
  getTokyoNightTheme,
}
