import React, { useState, useEffect, useRef } from "react";
import "../App.css";

const TimetableTable = () => {
  const classes = ["KG","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

  const [timetableData, setTimetableData] = useState(null);
  const [currentDay, setCurrentDay] = useState("");
  const [currentSlot, setCurrentSlot] = useState(null);
  const [currentTime, setCurrentTime] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teacherSchedule, setTeacherSchedule] = useState([]);
  const [teacherList, setTeacherList] = useState([]);

  const bellPlayedRef = useRef(null);

  // ✅ FETCH DATA
  useEffect(() => {
    fetch("/data/timetable.json")
      .then(res => res.json())
      .then(data => {
        setTimetableData(data);

        let teachers = [];

        Object.values(data.schedule || {}).forEach(day => {
          (day.classes || []).forEach(slot => {
            Object.values(slot.subjects || {}).forEach(school => {
              Object.values(school || {}).forEach(entry => {
                if (entry?.teacher) {
                  teachers.push(...entry.teacher.split("/").map(t => t.trim()));
                }
              });
            });
          });
        });

        (data.commonRoutine || []).forEach(item => {
          if (item.teacher) teachers.push(item.teacher.trim());
        });

        setTeacherList([...new Set(teachers.filter(Boolean))].sort());
      })
      .catch(err => console.error("❌ ERROR:", err));
  }, []);

  // ✅ TIME PARSER
  const parseTime = (timeStr) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (!match) return null;

    let [_, h, m, p] = match;
    h = parseInt(h);
    m = parseInt(m);

    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;

    return h * 60 + m;
  };

  // ✅ CURRENT SLOT + 🔔 BELL SYSTEM
  useEffect(() => {
    if (!timetableData) return;

    const update = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const day = now.toLocaleString("en-US", { weekday: "long" });

      setCurrentDay(day);

      const allSlots = [
        ...(timetableData.schedule?.[day]?.classes || []),
        ...(timetableData.commonRoutine || [])
      ];

      const active = allSlots.find(slot => {
        if (!slot.time?.includes("TO")) return false;
        const [start, end] = slot.time.split("TO").map(t => parseTime(t.trim()));
        return start !== null && end !== null && mins >= start && mins <= end;
      });

      // 🔔 BELL LOGIC (PLAYS EXACTLY ON CHANGE)
      if (active && active.time !== bellPlayedRef.current) {
        bellPlayedRef.current = active.time;

        const audio = new Audio("/sounds/bell.mp3");
        audio.play().catch(() => {});
      }

      setCurrentSlot(active || null);
    };

    update();
    const i = setInterval(update, 1000); // ✅ every second
    return () => clearInterval(i);
  }, [timetableData]);

  // ✅ CLOCK
  useEffect(() => {
    const clock = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };
    clock();
    const i = setInterval(clock, 1000);
    return () => clearInterval(i);
  }, []);

  // ✅ TEACHER ROUTINE
  useEffect(() => {
    if (!selectedTeacher || !timetableData) return;

    let schedule = [];
    const today = timetableData.schedule?.[currentDay]?.classes || [];

    today.forEach(slot => {
      Object.entries(slot.subjects || {}).forEach(([school, schoolData]) => {
        Object.entries(schoolData || {}).forEach(([cls, entry]) => {
          if (!entry.teacher) return;

          const teachers = entry.teacher.split("/").map(t => t.trim());

          if (teachers.includes(selectedTeacher)) {
            schedule.push({
              time: slot.time,
              class: `${cls} (${school === "Vincent Hill" ? "VH" : "SH"})`,
              subject: entry.subject || "-"
            });
          }
        });
      });
    });

    // COMMON ROUTINE
    (timetableData.commonRoutine || []).forEach(item => {
      if (item.teacher === selectedTeacher) {
        schedule.push({
          time: item.time,
          class: "All Classes",
          subject: item.remedial || item.break || "Activity"
        });
      }
    });

    setTeacherSchedule(schedule);
  }, [selectedTeacher, timetableData, currentDay]);

  return (
    <div className="fullscreen-container">

      {/* HEADER */}
      <div className="header">
        <h1>Guru Nanak Fifth Centenary School, Mussoorie</h1>
        <h2>📅 {currentDay} | 🕒 {currentTime}</h2>
      </div>

      {/* MAIN */}
      <div className="main-display">
        <div className="card">

          {currentSlot ? (
            currentSlot.break || currentSlot.remedial ? (
              <div className="big-text">
                {currentSlot.break || currentSlot.remedial}
              </div>
            ) : (
              <table className="timetable">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Vincent Hill</th>
                    <th>Shangri-la</th>
                  </tr>
                </thead>

                <tbody>
                  {classes.map(cls => {
                    const vh = currentSlot.subjects?.["Vincent Hill"]?.[cls];
                    const sh = currentSlot.subjects?.["Shangri-la"]?.[cls];

                    return (
                      <tr key={cls}>
                        <td>{cls}</td>
                        <td>{vh?.subject ? `${vh.subject} (${vh.teacher})` : "-"}</td>
                        <td>{sh?.subject ? `${sh.subject} (${sh.teacher})` : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            <div className="big-text">No Active Slot</div>
          )}

        </div>
      </div>

      {/* TEACHER DROPDOWN */}
      <div style={{ textAlign: "center", padding: "10px" }}>
        <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)}>
          <option value="">Select Teacher</option>
          {teacherList.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* TEACHER TABLE */}
      {teacherSchedule.length > 0 && (
        <div style={{ padding: "10px" }}>
          <table className="timetable">
            <thead>
              <tr>
                <th>Time</th>
                <th>Class</th>
                <th>Subject</th>
              </tr>
            </thead>
            <tbody>
              {teacherSchedule.map((e, i) => (
                <tr key={i}>
                  <td>{e.time}</td>
                  <td>{e.class}</td>
                  <td>{e.subject}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default TimetableTable;
