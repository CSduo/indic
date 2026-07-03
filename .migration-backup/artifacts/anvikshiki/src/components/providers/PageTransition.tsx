import { motion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{
        duration: 0.38,
        ease: [0.16, 1, 0.3, 1], // Custom premium ease-out curve
      }}
    >
      {children}
    </motion.div>
  );
}
