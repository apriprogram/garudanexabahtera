import React from 'react';
import { motion } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  width?: "fit-content" | "100%";
  height?: "fit-content" | "100%";
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  overflowVisible?: boolean;
}

export const Reveal: React.FC<RevealProps> = ({ 
  children, 
  width = "100%", 
  height = "fit-content",
  delay = 0.2,
  direction = "up",
  overflowVisible = false
}) => {
  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { y: 0, x: 40 },
    right: { y: 0, x: -40 },
  };

  return (
    <div style={{ 
      position: "relative", 
      width, 
      height, 
      overflow: overflowVisible ? "visible" : "hidden" 
    }}>
      <motion.div
        variants={{
          hidden: { opacity: 0, ...directions[direction] },
          visible: { opacity: 1, y: 0, x: 0 },
        }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: height === "100%" ? "100%" : "auto" }}
      >
        {children}
      </motion.div>
    </div>
  );
};
