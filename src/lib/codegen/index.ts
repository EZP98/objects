/**
 * Code Generation Module
 *
 * Exports functions for converting Canvas state to React code.
 */

export {
  generateReactCode,
  generateElementCode,
  stylesToTailwind,
  type GeneratedFiles,
  type GenerateOptions,
} from './generateReactCode';

export {
  useCanvasToCode,
  syncCanvasToWebContainer,
} from './useCanvasToCode';
