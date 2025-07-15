// ✅ IMPORTS
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

  // ✅ Load timetable data
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

  // ✅ Time parsing helper
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

  // ✅ Compute the active slot
  useEffect(() => {
    if (!timetableData) return;

    const updateSlot = () => {
      const now = new Date();
      const day = now.toLocaleString("en-US", { weekday: "long" });
      setCurrentDay(day);

      const currentMins = now.getHours() * 60 + now.getMinutes();

      // ✅ Merge day's classes with top-level commonRoutine
      const classSchedule = timetableData.schedule?.[day]?.classes || [];
      const commonRoutine = timetableData.commonRoutine || [];

      const mergedSchedule = [
        ...classSchedule,
        ...commonRoutine.map(item => ({
          ...item,
          isCommonRoutine: true
        }))
      ];

      // ✅ Find slot that matches current time
      const activeSlot = mergedSchedule.find(item => {
        if (!item.time?.includes(" TO ")) return false;
        const [start, end] = item.time.split(" TO ").map(t => t.trim());
        const startTime = parseTime(start);
        const endTime = parseTime(end);
        return startTime !== null && endTime !== null && currentMins >= startTime && currentMins <= endTime;
      }) || null;

      setCurrentSlot(activeSlot);
      setCurrentSlotTime(activeSlot ? activeSlot.time : "No active slot");
    };

    updateSlot();
    const interval = setInterval(updateSlot, 60000);
    return () => clearInterval(interval);
  }, [timetableData]);

  // ✅ Clock display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Teacher routine
  useEffect(() => {
    if (!selectedTeacher || !timetableData) return;
    const todaySchedule = timetableData.schedule?.[currentDay]?.classes || [];

    const teacherClasses = todaySchedule.flatMap(slot => {
      if (!slot || !slot.time || !slot.subjects) return [];
      return classes.flatMap(className => {
        let entries = [];
        const vhEntry = slot.subjects?.["Vincent Hill"]?.[className];
        const shEntry = slot.subjects?.["Shangri-la"]?.[className];

        if (vhEntry?.teacher?.split("/").includes(selectedTeacher)) {
          entries.push({ time: slot.time, class: `${className} (VH)`, subject: vhEntry.subject });
        }
        if (shEntry?.teacher?.split("/").includes(selectedTeacher)) {
          entries.push({ time: slot.time, class: `${className} (SH)`, subject: shEntry.subject });
        }
        return entries;
      });
    });

    setTeacherSchedule(teacherClasses);
  }, [selectedTeacher, timetableData, currentDay]);

  return (
    <div className="timetable-container">
      <h1 align="center">📅 School Timetable</h1>
      <h2 align="center">{currentDay} 🕒 {currentTime}</h2>
      <h3 align="center">📚 {currentSlotTime}</h3>

      <div className="table-wrapper">
        {currentSlot ? (
          <div className="responsive-table">
            <table className="timetable">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Vincent Hill</th>
                  <th>Shangri-la</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((className, idx) => {
                  // ✅ RENDER for breaks
                  if (currentSlot.break) {
                    return (
                      <tr key={idx}>
                        <td>{className}</td>
                        <td colSpan={2} align="center">{currentSlot.break}</td>
                      </tr>
                    );
                  }

                  if (currentSlot.remedial) {
                    return (
                      <tr key={idx}>
                        <td>{className}</td>
                        <td colSpan={2} align="center">{currentSlot.remedial}</td>
                      </tr>
                    );
                  }

                  if (currentSlot.isCommonRoutine) {
                    const activity = currentSlot.break || currentSlot.remedial || currentSlot.activity || "Common Routine";
                    return (
                      <tr key={idx}>
                        <td>{className}</td>
                        <td colSpan={2} align="center">{activity}</td>
                      </tr>
                    );
                  }

                  // ✅ NORMAL subject period
                  const subjects = currentSlot.subjects || {};
                  const vhEntry = subjects["Vincent Hill"]?.[className] || {};
                  const shEntry = subjects["Shangri-la"]?.[className] || {};

                  return (
                    <tr key={idx}>
                      <td>{className}</td>
                      <td>{vhEntry.subject ? `${vhEntry.subject} (${vhEntry.teacher})` : "-"}</td>
                      <td>{shEntry.subject ? `${shEntry.subject} (${shEntry.teacher})` : "-"}</td>
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

      {/* Teacher Routine */}
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
                {teacherSchedule.map((entry, idx) => (
                  <tr key={idx}>
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
