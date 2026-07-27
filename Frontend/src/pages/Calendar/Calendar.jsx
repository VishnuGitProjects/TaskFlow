import React, { useState, useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";
import { getTasks } from "../../services/taskService";
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaClock, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import "../../styles/calendar.css";

const Calendar = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    const fetchCalendarTasks = async () => {
      try {
        setLoading(true);
        const data = await getTasks();
        setTasks(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch calendar tasks:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendarTasks();
  }, []);

  // Helper values for month rendering
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate calendar days
  const calendarDays = [];
  // Blank days before the 1st of the month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(new Date(year, month, d));
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Critical": return "#ef4444";
      case "High": return "#f97316";
      case "Medium": return "#eab308";
      case "Low": return "#3b82f6";
      default: return "#94a3b8";
    }
  };

  return (
    <MainLayout>
      <div className="calendar-page-wrapper">
        <div className="calendar-header-section">
          <div className="calendar-title-box">
            <h1>Calendar</h1>
            <p>Track tasks, deadlines, and project milestones chronologically.</p>
          </div>
          <div className="calendar-month-controls">
            <button className="calendar-ctrl-btn" onClick={handlePrevMonth}>
              <FaChevronLeft />
            </button>
            <span className="calendar-month-label">
              {monthNames[month]} {year}
            </span>
            <button className="calendar-ctrl-btn" onClick={handleNextMonth}>
              <FaChevronRight />
            </button>
          </div>
        </div>

        <div className="calendar-content-grid">
          {/* Left panel: The Grid */}
          <div className="calendar-main-card">
            <div className="calendar-weekdays">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {loading ? (
              <div className="calendar-loading">Loading calendar events...</div>
            ) : (
              <div className="calendar-days-grid">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="calendar-day empty"></div>;
                  }

                  const dateString = day.toDateString();
                  const dayTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === dateString);
                  const isToday = new Date().toDateString() === dateString;

                  return (
                    <div key={dateString} className={`calendar-day ${isToday ? "today" : ""}`}>
                      <span className="day-number">{day.getDate()}</span>
                      <div className="day-tasks-container">
                        {dayTasks.map(task => (
                          <div
                            key={task._id}
                            className="calendar-task-badge"
                            style={{ borderLeftColor: getPriorityColor(task.priority) }}
                            onClick={() => setSelectedTask(task)}
                          >
                            <span className="task-badge-title">{task.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Details Card */}
          <div className="calendar-details-card">
            {selectedTask ? (
              <div className="task-details-content">
                <div className="details-header">
                  <span className="project-tag">{selectedTask.project?.name || "General"}</span>
                  <span
                    className="priority-tag"
                    style={{ background: getPriorityColor(selectedTask.priority) + "22", color: getPriorityColor(selectedTask.priority) }}
                  >
                    {selectedTask.priority}
                  </span>
                </div>
                <h2>{selectedTask.title}</h2>
                <p className="task-desc">{selectedTask.description || "No description provided."}</p>
                
                <div className="details-metadata">
                  <div className="metadata-row">
                    <FaClock className="meta-icon" />
                    <div>
                      <span className="meta-label">Due Date</span>
                      <span className="meta-val">
                        {new Date(selectedTask.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="metadata-row">
                    <FaCheckCircle className="meta-icon" />
                    <div>
                      <span className="meta-label">Status</span>
                      <span className="meta-val">{selectedTask.status}</span>
                    </div>
                  </div>
                  <div className="metadata-row">
                    <FaExclamationCircle className="meta-icon" />
                    <div>
                      <span className="meta-label">Progress</span>
                      <span className="meta-val">{selectedTask.progress}%</span>
                    </div>
                  </div>
                </div>

                <button className="btn-close-details" onClick={() => setSelectedTask(null)}>
                  Clear Details
                </button>
              </div>
            ) : (
              <div className="no-task-selected">
                <FaCalendarAlt className="placeholder-icon" />
                <h3>No Task Selected</h3>
                <p>Click on any task badge in the calendar to view full description, status, and milestone details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Calendar;