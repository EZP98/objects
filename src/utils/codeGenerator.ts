import { format } from 'prettier/standalone';
import * as prettierPluginBabel from 'prettier/plugins/babel';
import * as prettierPluginEstree from 'prettier/plugins/estree';

// Types matching DesignEditor
export interface Animation {
  property: string;
  from: number | string;
  to: number | string;
  duration: number;
  delay: number;
  easing: string;
}

export interface Keyframe {
  id: string;
  time: number; // 0-100 percentage
  properties: Record<string, number | string>;
}

export interface DesignElement {
  id: string;
  type: 'rectangle' | 'ellipse' | 'text' | 'image' | 'frame';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerRadius: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  imageUrl?: string;
  children?: string[];
  parentId?: string | null;
  animations: Animation[];
  keyframes: Keyframe[];
}

// Convert easing name to Framer Motion easing
function getEasing(easing: string): string {
  const easingMap: Record<string, string> = {
    'linear': '[0, 0, 1, 1]',
    'ease': '[0.25, 0.1, 0.25, 1]',
    'ease-in': '[0.42, 0, 1, 1]',
    'ease-out': '[0, 0, 0.58, 1]',
    'ease-in-out': '[0.42, 0, 0.58, 1]',
  };
  return easingMap[easing] || easingMap['ease'];
}

// Convert animation property to Framer Motion property
function getMotionProperty(property: string): string {
  const propertyMap: Record<string, string> = {
    'x': 'x',
    'y': 'y',
    'width': 'width',
    'height': 'height',
    'opacity': 'opacity',
    'rotation': 'rotate',
    'scale': 'scale',
  };
  return propertyMap[property] || property;
}

// Generate style object for an element
function generateStyleObject(element: DesignElement): string {
  const styles: string[] = [];

  styles.push(`position: 'absolute'`);
  styles.push(`left: ${element.x}`);
  styles.push(`top: ${element.y}`);
  styles.push(`width: ${element.width}`);
  styles.push(`height: ${element.height}`);

  if (element.rotation !== 0) {
    styles.push(`transform: 'rotate(${element.rotation}deg)'`);
  }

  if (element.opacity !== 1) {
    styles.push(`opacity: ${element.opacity}`);
  }

  if (element.type !== 'text') {
    styles.push(`backgroundColor: '${element.fill}'`);
  }

  if (element.strokeWidth > 0 && element.stroke !== 'transparent') {
    styles.push(`border: '${element.strokeWidth}px solid ${element.stroke}'`);
  }

  if (element.cornerRadius > 0) {
    styles.push(`borderRadius: ${element.cornerRadius}`);
  }

  if (element.type === 'ellipse') {
    styles.push(`borderRadius: '50%'`);
  }

  if (element.type === 'text') {
    styles.push(`color: '${element.fill}'`);
    if (element.fontSize) {
      styles.push(`fontSize: ${element.fontSize}`);
    }
    if (element.fontFamily) {
      styles.push(`fontFamily: '${element.fontFamily}'`);
    }
  }

  return `{ ${styles.join(', ')} }`;
}

// Generate Framer Motion animation props
function generateAnimationProps(element: DesignElement): string {
  if (element.animations.length === 0 && element.keyframes.length === 0) {
    return '';
  }

  const props: string[] = [];

  if (element.animations.length > 0) {
    // Simple animations
    const initial: string[] = [];
    const animate: string[] = [];
    const transitions: string[] = [];

    element.animations.forEach((anim, index) => {
      const motionProp = getMotionProperty(anim.property);
      initial.push(`${motionProp}: ${typeof anim.from === 'string' ? `'${anim.from}'` : anim.from}`);
      animate.push(`${motionProp}: ${typeof anim.to === 'string' ? `'${anim.to}'` : anim.to}`);

      if (index === 0) {
        transitions.push(`duration: ${anim.duration}`);
        transitions.push(`delay: ${anim.delay}`);
        transitions.push(`ease: ${getEasing(anim.easing)}`);
      }
    });

    props.push(`initial={{ ${initial.join(', ')} }}`);
    props.push(`animate={{ ${animate.join(', ')} }}`);
    props.push(`transition={{ ${transitions.join(', ')} }}`);
  }

  if (element.keyframes.length > 0) {
    // Keyframe animations - more complex
    const sortedKeyframes = [...element.keyframes].sort((a, b) => a.time - b.time);

    // Get all animated properties
    const animatedProps = new Set<string>();
    sortedKeyframes.forEach(kf => {
      Object.keys(kf.properties).forEach(prop => animatedProps.add(prop));
    });

    // Build keyframe arrays for each property
    const keyframeArrays: Record<string, (number | string)[]> = {};
    const times: number[] = sortedKeyframes.map(kf => kf.time / 100);

    animatedProps.forEach(prop => {
      keyframeArrays[prop] = sortedKeyframes.map(kf => kf.properties[prop] ?? 0);
    });

    // Generate animate prop with arrays
    const animateEntries = Object.entries(keyframeArrays).map(([prop, values]) => {
      const motionProp = getMotionProperty(prop);
      return `${motionProp}: [${values.join(', ')}]`;
    });

    props.push(`animate={{ ${animateEntries.join(', ')} }}`);
    props.push(`transition={{ duration: 2, times: [${times.join(', ')}], repeat: Infinity }}`);
  }

  return props.join('\n        ');
}

// Generate JSX for a single element
function generateElementJSX(element: DesignElement, indent: string = '      '): string {
  const hasAnimation = element.animations.length > 0 || element.keyframes.length > 0;
  const tag = hasAnimation ? 'motion.div' : 'div';
  const animProps = generateAnimationProps(element);

  let jsx = '';

  if (element.type === 'text') {
    jsx = `
${indent}<${tag}
${indent}  style={${generateStyleObject(element)}}${animProps ? '\n' + indent + '  ' + animProps : ''}
${indent}>
${indent}  ${element.text || 'Text'}
${indent}</${tag}>`;
  } else if (element.type === 'image' && element.imageUrl) {
    jsx = `
${indent}<${tag}
${indent}  style={${generateStyleObject(element)}}${animProps ? '\n' + indent + '  ' + animProps : ''}
${indent}>
${indent}  <img src="${element.imageUrl}" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
${indent}</${tag}>`;
  } else {
    jsx = `
${indent}<${tag}
${indent}  style={${generateStyleObject(element)}}${animProps ? '\n' + indent + '  ' + animProps : ''}
${indent}/>`;
  }

  return jsx;
}

// Generate full React component code
export function generateReactCode(elements: DesignElement[], componentName: string = 'DesignComponent'): string {
  const hasAnimations = elements.some(el => el.animations.length > 0 || el.keyframes.length > 0);

  const imports = [
    `import React from 'react';`,
  ];

  if (hasAnimations) {
    imports.push(`import { motion } from 'framer-motion';`);
  }

  // Filter root elements (no parent)
  const rootElements = elements.filter(el => !el.parentId);

  const elementsJSX = rootElements
    .map(el => generateElementJSX(el))
    .join('\n');

  const code = `${imports.join('\n')}

const ${componentName} = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
${elementsJSX}
    </div>
  );
};

export default ${componentName};
`;

  return code;
}

// Format code with Prettier
export async function formatCode(code: string): Promise<string> {
  try {
    return await format(code, {
      parser: 'babel',
      plugins: [prettierPluginBabel, prettierPluginEstree],
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
      printWidth: 80,
    });
  } catch (error) {
    console.warn('Prettier formatting failed:', error);
    return code;
  }
}

// Generate and format code
export async function generateFormattedReactCode(
  elements: DesignElement[],
  componentName: string = 'DesignComponent'
): Promise<string> {
  const code = generateReactCode(elements, componentName);
  return formatCode(code);
}
