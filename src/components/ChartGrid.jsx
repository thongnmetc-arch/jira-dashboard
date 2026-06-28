import { motion } from 'framer-motion';
import SprintBarChart from './charts/SprintBarChart';
import ComponentBarChart from './charts/ComponentBarChart';
import DailyTrendChart from './charts/DailyTrendChart';
import TypeDoughnutChart from './charts/TypeDoughnutChart';
import AssigneeBarChart from './charts/AssigneeBarChart';
import BurndownChart from './charts/BurndownChart';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const childVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: 'easeOut' } },
};

export default function ChartGrid({ tasks }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
    >
      <motion.div variants={childVariants} className="rounded-xl shadow-sm"><SprintBarChart tasks={tasks} /></motion.div>
      <motion.div variants={childVariants} className="rounded-xl shadow-sm"><ComponentBarChart tasks={tasks} /></motion.div>
      <motion.div variants={childVariants} className="rounded-xl shadow-sm"><DailyTrendChart tasks={tasks} /></motion.div>
      <motion.div variants={childVariants} className="rounded-xl shadow-sm"><TypeDoughnutChart tasks={tasks} /></motion.div>
      <motion.div variants={childVariants} className="md:col-span-2 rounded-xl shadow-sm"><AssigneeBarChart tasks={tasks} /></motion.div>
      <motion.div variants={childVariants} className="md:col-span-2 rounded-xl shadow-sm"><BurndownChart tasks={tasks} /></motion.div>
    </motion.div>
  );
}
