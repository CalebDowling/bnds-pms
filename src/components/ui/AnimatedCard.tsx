"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
  hoverScale?: boolean;
  style?: React.CSSProperties;
}

export default function AnimatedCard({
  children,
  className,
  index = 0,
  hoverScale = true,
  style,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1], // ease-out
      }}
      whileHover={
        hoverScale
          ? {
              y: -3,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
              transition: { duration: 0.2 },
            }
          : undefined
      }
      whileTap={hoverScale ? { scale: 0.98 } : undefined}
      className={cn("will-change-transform", className)}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// Staggered list container
export function AnimatedList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.04,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Page transition wrapper
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
