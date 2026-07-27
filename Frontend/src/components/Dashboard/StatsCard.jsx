import { FaEllipsisV } from "react-icons/fa";
import "../../styles/dashboard.css";

const StatsCard = ({ title, value, icon, trend, trendDir = "up", color = "#8b5cf6", chartData = [10, 15, 8, 14, 12, 16, 20] }) => {
  // Generate SVG path for sparkline
  const max = Math.max(...chartData);
  const min = Math.min(...chartData);
  const range = max - min || 1;
  const svgWidth = 260;
  const svgHeight = 40;

  const points = chartData.map((val, idx) => {
    const x = (idx / (chartData.length - 1)) * svgWidth;
    const y = svgHeight - ((val - min) / range) * (svgHeight - 8) - 4; // 4px padding
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div className="stats-icon-wrapper" style={{ background: `${color}15`, color: color }}>
          {icon}
        </div>
        <button className="stats-options-btn">
          <FaEllipsisV />
        </button>
      </div>

      <div className="stats-card-body">
        <h2>{value}</h2>
      </div>

      <div className="stats-card-footer">
        <p>{title}</p>
      </div>

      {/* Pure SVG Sparkline with Gradient Fill */}
      <div className="stats-sparkline-container">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`sparkline-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#sparkline-grad-${color.replace("#", "")})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

export default StatsCard;