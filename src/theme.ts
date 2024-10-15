import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '../tailwind.config.js'

export const { theme } = resolveConfig(tailwindConfig)
