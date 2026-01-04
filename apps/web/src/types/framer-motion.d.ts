// Type override for framer-motion to fix React 19 compatibility
// These overrides are needed because framer-motion's types aren't yet
// fully compatible with React 19's stricter ReactNode type
// See: https://github.com/framer/motion/issues/2595

import * as React from "react";
import { HTMLMotionProps, MotionValue } from "framer-motion";

declare module "framer-motion" {
  export interface MotionProps {
    children?: React.ReactNode;
  }

  // Override motion component return types
  type MotionComponent<T extends keyof JSX.IntrinsicElements> = React.ForwardRefExoticComponent<
    Omit<HTMLMotionProps<T>, "ref"> & React.RefAttributes<HTMLElement>
  >;
}

// Extend ReactNode to accept MotionValue
declare global {
  namespace React {
    interface ReactPortal {
      children?: ReactNode | MotionValue<number> | MotionValue<string>;
    }
  }
}

export {};
