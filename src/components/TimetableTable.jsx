import React, { useState, useEffect, useMemo, useRef } from "react";
import "../App.css";

const TimetableTable = () => {

  const classes = ["KG","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

  const [timetableData, setTimetableData] = useState(null);
  const [currentDay, setCurrentDay] = useState("");
  const [currentSlot, setCurrentSlot] = useState(null);
  const [currentTime, setCurrentTime] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teacherSchedule, setTeacherSchedule] = useState([]);

  const bellRef = useRef(null);
  const lastSlot = useRef("");

  // ✅ LOAD DATA (FIXED FOR YOUR STRUCTURE)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}timetable.json`)
      .then(res => res.json())
      .then(data => {
        console.log("✅ DATA LOADED:", data);
        setTimetableData(data);
      })
      .catch(err => console.error("❌ ERROR:", err));
  }, []);

  // ✅ TIME PARSER
  const parseTime = (timeStr) => {
    if (!timeStr) return null;

    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;

    let [_, h, m, p] = match;
    h = parseInt(h);
    m = parseInt(m);

    if (p.toUpperCase() === "PM" && h !== 12) h += 12;
    if (p.toUpperCase() === "AM" && h === 12) h = 0;

    return h * 60 + m;
  };

  // ✅ SLOT DETECTION + COMMON ROUTINE + BELL
  useEffect(() => {
    if (!timetableData) return;

    const update = () => {
      const now = new Date();
      const day = now.toLocaleString("en-US", { weekday: "long" });
      setCurrentDay(day);

      const mins = now.getHours() * 60 + now.getMinutes();

      const schedule = timetableData.schedule?.[day]?.classes || [];
      const common = timetableData.commonRoutine || [];

      const merged = [
        ...schedule,
        ...common.map(c => ({ ...c, isCommon: true }))
      ];

      const active = merged.find(item => {
        if (!item.time?.includes(" TO ")) return false;

        const [start, end] = item.time.split(" TO ");
        const s = parseTime(start);
        const e = parseTime(end);

        return mins >= s && mins < e;
      });

      setCurrentSlot(active || null);

      // 🔊 Bell
      if (active?.time && lastSlot.current !== active.time) {
        lastSlot.current = active.time;
        bellRef.current?.play().catch(() => {});
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);

  }, [timetableData]);

  // ✅ CLOCK
  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ✅ FORMAT ENTRY
  const formatEntry = (entry) => {
    if (!entry) return "-";

    const subject = entry.subject || "";
    const teacher = entry.teacher || "";

    if (!subject && !teacher) return "-";

    return `${subject}${teacher ? ` (${teacher})` : ""}`;
  };

  // ✅ TEACHER LIST
  const teacherList = useMemo(() => {
    if (!timetableData) return [];

    let teachers = [];

    Object.values(timetableData.schedule || {}).forEach(day => {
      (day.classes || []).forEach(slot => {
        if (!slot.subjects) return;

        Object.values(slot.subjects).forEach(school => {
          Object.values(school || {}).forEach(entry => {
            if (entry?.teacher) {
              teachers.push(...entry.teacher.split("/"));
            }
          });
        });
      });
    });

    (timetableData.commonRoutine || []).forEach(item => {
      if (item.teacher) {
        teachers.push(...item.teacher.split("/"));
      }
    });

    return [...new Set(teachers.map(t => t.trim()).filter(Boolean))];

  }, [timetableData]);

  // ✅ TEACHER ROUTINE
  useEffect(() => {
    if (!selectedTeacher || !timetableData) return;

    const today = timetableData.schedule?.[currentDay]?.classes || [];

    const getTeachers = (str) =>
      str ? str.split("/").map(t => t.trim()) : [];

    const result = today.flatMap(slot => {
      if (!slot.subjects) return [];

      return classes.flatMap(c => {
        let arr = [];

        const vh = slot.subjects?.["Vincent Hill"]?.[c];
        const sh = slot.subjects?.["Shangri-la"]?.[c];

        if (getTeachers(vh?.teacher).includes(selectedTeacher)) {
          arr.push({ time: slot.time, class: `${c} VH`, subject: vh.subject });
        }

        if (getTeachers(sh?.teacher).includes(selectedTeacher)) {
          arr.push({ time: slot.time, class: `${c} SH`, subject: sh.subject });
        }

        return arr;
      });
    });

    setTeacherSchedule(result);

  }, [selectedTeacher, timetableData, currentDay]);

  return (
    <div className="timetable-container">

      {/* 🔊 Bell */}
      <audio ref={bellRef} src={`${import.meta.env.BASE_URL}sounds/bell.mp3`} />

      <h1>📅 School Timetable</h1>
      <h2>{currentDay} | {currentTime}</h2>

      {currentSlot ? <h3>{currentSlot.time}</h3> : <p>No active slot</p>}

      {/* TABLE */}
      {currentSlot && (
        <table className="timetable">
          <thead>
            <tr>
              <th>Class</th>
              <th>Vincent Hill</th>
              <th>Shangri-la</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c, i) => {

              if (currentSlot.break || currentSlot.remedial || currentSlot.isCommon) {
                const text =
                  currentSlot.break ||
                  currentSlot.remedial ||
                  "Common Routine";

                return i === 0 ? (
                  <tr key={i}>
                    <td colSpan={3}>{text}</td>
                  </tr>
                ) : null;
              }

              const vh = currentSlot.subjects?.["Vincent Hill"]?.[c];
              const sh = currentSlot.subjects?.["Shangri-la"]?.[c];

              return (
                <tr key={i}>
                  <td>{c}</td>
                  <td>{formatEntry(vh)}</td>
                  <td>{formatEntry(sh)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* TEACHER DROPDOWN */}
      <h3>Select Teacher</h3>
      <select value={selectedTeacher} onChange={(e)=>setSelectedTeacher(e.target.value)}>
        <option value="">Select Teacher</option>
        {teacherList.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* TEACHER ROUTINE */}
      {teacherSchedule.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Class</th>
              <th>Subject</th>
            </tr>
          </thead>
          <tbody>
            {teacherSchedule.map((e,i)=>(
              <tr key={i}>
                <td>{e.time}</td>
                <td>{e.class}</td>
                <td>{e.subject}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

    </div>
  );
};

export default TimetableTable;
