import React, { useState, useEffect } from "react";
import "../App.css";

const TimetableTable = () => {
  const classes = ["KG", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const [timetableData, setTimetableData] = useState(null);
  const [currentDay, setCurrentDay] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [currentSlot, setCurrentSlot] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teacherSchedule, setTeacherSchedule] = useState([]);
  const [currentRoutine, setCurrentRoutine] = useState(null);

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
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

      const todaySchedule = timetableData.schedule?.[day]?.classes || [];
      const commonRoutine = timetableData.commonRoutine || [];
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

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
          return startTime !== null && endTime !== null && currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime;
        });
      };

      setCurrentSlot(findCurrentSlot(todaySchedule) || null);
      setCurrentRoutine(findCurrentSlot(commonRoutine) || null);
    };

    updateSlot();
    const interval = setInterval(updateSlot, 1000);
    return () => clearInterval(interval);
  }, [timetableData]);

  useEffect(() => {
    if (!selectedTeacher || !timetableData) return;
    const todaySchedule = timetableData.schedule?.[currentDay]?.classes || [];

    const teacherClasses = todaySchedule.flatMap(slot => {
      return classes.flatMap(className => {
        let scheduleEntries = [];

        const vincentEntry = slot.subjects?.["Vincent Hill"]?.[className];
        const shangrilaEntry = slot.subjects?.["Shangri-la"]?.[className];

        if (vincentEntry?.teacher?.split("/").includes(selectedTeacher)) {
          scheduleEntries.push({ time: slot.time, class: `${className} (VH)`, subject: vincentEntry.subject });
        }
        if (shangrilaEntry?.teacher?.split("/").includes(selectedTeacher)) {
          scheduleEntries.push({ time: slot.time, class: `${className} (SH)`, subject: shangrilaEntry.subject });
        }
        return scheduleEntries;
      });
    });

    setTeacherSchedule(teacherClasses);
  }, [selectedTeacher, timetableData, currentDay]);

  return (
    <div className="timetable-container">

<h1 className="title-3d full-width single-line" style={{ fontSize: "1.8rem" }} align="center">📅 School Timetable</h1>
   
<div className="day-time-box full-width box-3d compact" style={{ fontSize: "1.0rem" }}>
  <h2>📆 {currentDay} ⏰ {currentTime}</h2>
</div>
   
{currentSlot && <h3 className="current-slot" style={{ fontSize: "0.8rem" }} align="center">🕒 {currentSlot.time}</h3>}

    
      
      {currentRoutine && (
        <div className="routine-card compact">
          <h2 className="routine-time">🕒 {currentRoutine.time}</h2>
          <p>🔹 {currentRoutine.break}</p>
          {currentRoutine.teacher && <p>👨‍🏫 Teacher: {currentRoutine.teacher}</p>}
        </div>
      )}

      <div className="teacher-schedule">
        <h3 align="center">Select a Teacher:</h3>
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

        {teacherSchedule.length > 0 && (
          <div className="teacher-routine-box">
            <h3>📖 {selectedTeacher}'s Routine</h3>
            <table>
              <thead>
                <tr>
                  <th>⏰ Time</th>
                  <th>🏫 Class</th>
                  <th>📚 Subject</th>
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
        )}
      </div>
    </div>
  );
};

export default TimetableTable;
