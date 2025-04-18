import {
  githubDarkTheme,
  githubLightTheme,
  monoLightTheme,
  monoDarkTheme,
  candyWrapperTheme,
  psychedelicTheme,
  Theme,
} from '@json-edit-react'

// This file contains functions that return theme objects
// Each function is dynamically imported when needed to reduce initial bundle size

export const getGithubDarkTheme = (): Theme => githubDarkTheme
export const getGithubLightTheme = (): Theme => githubLightTheme
export const getWhiteBlackTheme = (): Theme => monoLightTheme
export const getBlackWhiteTheme = (): Theme => monoDarkTheme
export const getCandyWrapperTheme = (): Theme => candyWrapperTheme
export const getPsychedelicTheme = (): Theme => psychedelicTheme

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
}
