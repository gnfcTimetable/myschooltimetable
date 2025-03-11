import React, { useState, useEffect } from "react";
import "../App.css";

const TimetableTable = () => {
  const classes = ["KG", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const [timetableData, setTimetableData] = useState(null);
  const [currentDay, setCurrentDay] = useState("");
  const [currentSlot, setCurrentSlot] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teacherSchedule, setTeacherSchedule] = useState([]);
  const [currentTime, setCurrentTime] = useState("");
  const [currentSlotTime, setCurrentSlotTime] = useState("");

  useEffect(() => {
    const fetchTimetable = () => {
      fetch(`${import.meta.env.BASE_URL}data/timetable.json`)
        .then((response) => response.json())
        .then((data) => setTimetableData(data))
        .catch((error) => console.error("Error loading timetable data:", error));
    };

    fetchTimetable();
    const interval = setInterval(fetchTimetable, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateSlot = () => {
      if (!timetableData) return;

      const now = new Date();
      const day = now.toLocaleString("en-US", { weekday: "long" });
      setCurrentDay(day);

      const todaySchedule = timetableData.schedule?.[day]?.classes || [];
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const parseTime = (timeStr) => {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!match) return null;
        let [_, hour, minute, period] = match;
        hour = parseInt(hour, 10);
        minute = parseInt(minute, 10);
        if (period) {
          if (period.toUpperCase() === "PM" && hour !== 12) hour += 12;
          if (period.toUpperCase() === "AM" && hour === 12) hour = 0;
        }
        return hour * 60 + minute;
      };

      const findCurrentSlot = (schedule) => {
        return schedule.find(period => {
          if (!period.time.includes(" TO ")) return false;
          const [start, end] = period.time.split(" TO ").map(t => t.trim());
          const startTime = parseTime(start);
          const endTime = parseTime(end);
          return startTime !== null && endTime !== null && currentTime >= startTime && currentTime <= endTime;
        });
      };

      const activeSlot = findCurrentSlot(todaySchedule) || null;
      setCurrentSlot(activeSlot);
      setCurrentSlotTime(activeSlot ? activeSlot.time : "No active slot");
    };

    updateSlot();
    const interval = setInterval(updateSlot, 60000);
    return () => clearInterval(interval);
  }, [timetableData]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit", 
        hour12: true 
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedTeacher || !timetableData) return;
    const todaySchedule = timetableData.schedule?.[currentDay]?.classes || [];

    const teacherClasses = todaySchedule.flatMap(slot => {
      if (!slot || !slot.time) return [];
      const slotTime = slot.time;

      return classes.flatMap(className => {
        let scheduleEntries = [];

        const vincentEntry = slot.subjects?.["Vincent Hill"]?.[className];
        const shangrilaEntry = slot.subjects?.["Shangri-la"]?.[className];

        if (vincentEntry?.teacher?.split("/").includes(selectedTeacher)) {
          scheduleEntries.push({ time: slotTime, class: `${className} (VH)`, subject: vincentEntry.subject });
        }
        if (shangrilaEntry?.teacher?.split("/").includes(selectedTeacher)) {
          scheduleEntries.push({ time: slotTime, class: `${className} (SH)`, subject: shangrilaEntry.subject });
        }
        return scheduleEntries;
      });
    });

    setTeacherSchedule(teacherClasses);
  }, [selectedTeacher, timetableData, currentDay]);

  return (
    <div className="timetable-container">
      <h1 className="title" align="center">📅 School Timetable</h1>
      <h2 className="day" align="center">{currentDay}🕒 {currentTime}</h2>
      <h3 className="current-time" align="center"></h3>
      <h3 className="current-slot-time" align="center">📚 {currentSlotTime}</h3>

      <div className="table-wrapper">
        {currentSlot ? (
          <div className="responsive-table">
            <table className="timetable">
              <thead>
                <tr>
                  <th className="class-header">Class</th>
                  <th className="vincent-hill-header">Vincent Hill</th>
                  <th className="shangri-la-header">Shangri-la</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((className, classIndex) => {
                  const displayClassName = `Class ${className}`;
                  const subjects = currentSlot?.subjects || {};
                  const vincentHillEntry = subjects["Vincent Hill"]?.[className] || {};
                  const shangrilaEntry = subjects["Shangri-la"]?.[className] || {};
                  return (
                    <tr key={classIndex} className="timetable-row">
                      <td className="class-cell">{displayClassName}</td>
                      <td className="vincent-cell">{vincentHillEntry.subject ? `${vincentHillEntry.subject} (${vincentHillEntry.teacher})` : "-"}</td>
                      <td className="shangri-cell">{shangrilaEntry.subject ? `${shangrilaEntry.subject} (${shangrilaEntry.teacher})` : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-classes">No active classes at this time.</p>
        )}
      </div>

      {/* Teacher Dropdown */}
      <div className="teacher-schedule">
        <h3>Select a Teacher:</h3>
        <select onChange={(e) => setSelectedTeacher(e.target.value)} value={selectedTeacher}>
          <option value="">Select a Teacher</option>
          {Array.from(new Set(
            Object.values(timetableData?.schedule?.[currentDay]?.classes || []).flatMap(slot =>
              Object.values(slot.subjects || {}).flatMap(school =>
                Object.values(school || {}).flatMap(entry =>
                  entry.teacher ? entry.teacher.split("/") : []
                )
              )
            )
          )).map(teacher => (
            <option key={teacher} value={teacher}>{teacher}</option>
          ))}
        </select>
      </div>

      {/* Display Teacher's Routine in Table */}
      {teacherSchedule.length > 0 && (
        <div className="teacher-routine">
          <h3>{selectedTeacher}'s Schedule</h3>
          <div className="responsive-table">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Class</th>
                  <th>Subject</th>
                </tr>
              </thead>
              <tbody>
                {teacherSchedule.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.time}</td>
                    <td>{entry.class}</td>
                    <td>{entry.subject}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableTable;
