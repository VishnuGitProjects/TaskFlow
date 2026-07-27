import React from "react";
import {
  FaEnvelope,
  FaLock,
  FaShieldAlt,
  FaFolder,
  FaUser,
  FaCheck,
  FaRegPaperPlane,
} from "react-icons/fa";
import { MdChecklist } from "react-icons/md";

function AuthGraphic({ mode = "login" }) {
  return (
    <div className="auth-graphic-container">
      {/* 3D Platform Base */}
      <div className="platform-3d">
        <div className="platform-ring-glow"></div>
        <div className="platform-surface"></div>
        <div className="platform-reflection"></div>
      </div>

      {/* Floating Elements based on Mode */}
      {mode === "login" || mode === "signup" ? (
        <>
          {/* Card 1: Floating Line Chart */}
          <div className="floating-widget line-chart-widget">
            <div className="widget-header">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>
            <div className="widget-content">
              <svg viewBox="0 0 100 50" className="chart-svg">
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,45 Q15,10 30,35 T60,15 T90,25 T100,20 L100,50 L0,50 Z"
                  fill="url(#chart-grad)"
                />
                <path
                  d="M0,45 Q15,10 30,35 T60,15 T90,25 T100,20"
                  fill="none"
                  stroke="url(#line-glow)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <linearGradient id="line-glow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </svg>
            </div>
          </div>

          {/* Card 2: Floating Task List */}
          <div className="floating-widget checklist-widget">
            <div className="widget-header">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>
            <div className="widget-content">
              <div className="check-item">
                <span className="check-circle done"><FaCheck size={8} /></span>
                <span className="check-line"></span>
              </div>
              <div className="check-item">
                <span className="check-circle done"><FaCheck size={8} /></span>
                <span className="check-line"></span>
              </div>
              <div className="check-item">
                <span className="check-circle done"><FaCheck size={8} /></span>
                <span className="check-line"></span>
              </div>
            </div>
          </div>

          {/* Card 3: Floating Donut Chart */}
          <div className="floating-widget donut-chart-widget">
            <div className="widget-content donut-content">
              <svg viewBox="0 0 36 36" className="donut-svg">
                <path
                  className="donut-ring"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="3.5"
                />
                <path
                  className="donut-segment segment1"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="3.5"
                  strokeDasharray="40 100"
                  strokeDashoffset="0"
                />
                <path
                  className="donut-segment segment2"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  strokeDasharray="30 100"
                  strokeDashoffset="-40"
                />
                <path
                  className="donut-segment segment3"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeDasharray="20 100"
                  strokeDashoffset="-70"
                />
              </svg>
            </div>
          </div>

          {/* Floating Icon Sphere 1: User */}
          <div className="icon-sphere user-sphere">
            <FaUser />
          </div>

          {/* Floating Icon Sphere 2: Folder */}
          <div className="icon-sphere folder-sphere">
            <FaFolder />
          </div>

          {/* Floating Icon Sphere 3: Checkmark */}
          <div className="icon-sphere check-sphere">
            <FaCheck />
          </div>
        </>
      ) : mode === "forgot" ? (
        <>
          {/* Floating Glass Envelope Widget */}
          <div className="floating-widget envelope-widget">
            <div className="glass-letter">
              <div className="letter-flap"></div>
              <div className="letter-body"></div>
              <div className="letter-paper">
                <FaRegPaperPlane className="paper-send-icon" />
              </div>
            </div>
          </div>

          {/* Glowing Mail Spheres */}
          <div className="icon-sphere mail-sphere">
            <FaEnvelope />
          </div>
          <div className="icon-sphere check-sphere">
            <FaCheck />
          </div>
        </>
      ) : mode === "reset" ? (
        <>
          {/* Floating Lock Widget */}
          <div className="floating-widget lock-widget">
            <div className="glass-padlock">
              <div className="padlock-shackle"></div>
              <div className="padlock-body">
                <FaLock className="lock-inner-icon" />
              </div>
            </div>
          </div>

          {/* Glowing Lock Spheres */}
          <div className="icon-sphere lock-sphere">
            <FaLock />
          </div>
          <div className="icon-sphere check-sphere">
            <FaCheck />
          </div>
        </>
      ) : (
        <>
          {/* Floating Shield Widget */}
          <div className="floating-widget shield-widget">
            <div className="glass-shield">
              <FaShieldAlt className="shield-inner-icon" />
              <div className="shield-check">
                <FaCheck />
              </div>
            </div>
          </div>

          {/* Glowing Shield Spheres */}
          <div className="icon-sphere shield-sphere">
            <FaShieldAlt />
          </div>
          <div className="icon-sphere check-sphere">
            <FaCheck />
          </div>
        </>
      )}

      {/* Background Decorative Small Spheres */}
      <div className="mini-sphere ms1"></div>
      <div className="mini-sphere ms2"></div>
      <div className="mini-sphere ms3"></div>
    </div>
  );
}

export default AuthGraphic;
