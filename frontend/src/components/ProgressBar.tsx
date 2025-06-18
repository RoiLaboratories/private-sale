interface ProgressBarProps {
  current: number;
  total: number;
  softCap: number;
  label?: string;
}

const ProgressBar = ({ current, total, softCap, label }: ProgressBarProps) => {
  // Calculate percentage
  const percentage = (current / total) * 100;
  const isSoftCapReached = current >= softCap;
  const formattedPercentage = Math.min(100, Math.max(0, percentage)).toFixed(2);

  return (
    <div className="w-full mt-2 mb-4">
      {label && <div className="text-sm text-gray-300 mb-1">{label}</div>}
      <div className="w-full bg-gray-700 rounded-full h-4 mb-1">
        <div 
          className={`h-4 rounded-full ${isSoftCapReached ? 'bg-green-500' : 'bg-orange-500'}`} 
          style={{ width: `${formattedPercentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{formattedPercentage}%</span>
        <span>{current} / {total} USDC</span>
      </div>
    </div>
  );
};

export default ProgressBar;
