import { motion } from 'framer-motion';

/**
 * A colored badge showing a label name.
 * Uses the label's defined color with light background + border.
 * Falls back to gray "?" if labelDef is missing.
 */
export default function LabelBadge({ labelId, labelDefs, className = '', ...rest }) {
  const def = labelDefs?.[labelId];
  const color = def?.color || '#6b7280';
  const name = def?.name || labelId || '?';

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center rounded-full text-[11px] px-2 py-0.5 font-medium border whitespace-nowrap ${className}`}
      style={{
        backgroundColor: `${color}20`,
        color,
        borderColor: `${color}40`,
      }}
      {...rest}
    >
      {name}
    </motion.span>
  );
}
