import React, { useState, useEffect, useMemo, useRef } from "react";
import "../App.css";

const TimetableTable = () => {

  const classes = ["KG","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

  const [timetableData, setTimetableData] = useState(null);
  const [currentDay, setCurrentDay] = useState("");
  const [currentSlot, setCurrentSlot] = useState(null);
  const [nextSlot, setNextSlot] = useState(null);
  const [currentTime, setCurrentTime] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teacherSchedule, setTeacherSchedule] = useState([]);
  const [isIdle, setIsIdle] = useState(false);

  const bellRef = useRef(null);
  const lastPlayedSlot = useRef("");

  // ✅ LOAD DATA
  useEffect(() => {
    const fetchData = () => {
      fetch("/data/timetable.json")
        .then(res => res.json())
        .then(data => setTimetableData(data))
        .catch(err => console.error(err));
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // ✅ TIME PARSER (SAFE)
  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return null;

    let [_, h, m, p] = match;
    h = parseInt(h); m = parseInt(m);

    if (p) {
      if (p.toUpperCase() === "PM" && h !== 12) h += 12;
      if (p.toUpperCase() === "AM" && h === 12) h = 0;
    }

    return h * 60 + m;
  };

  // ✅ SLOT DETECTION + BELL + COMMON ROUTINE
  useEffect(() => {
    if (!timetableData) return;

    const updateSlot = () => {
      const now = new Date();
      const day = now.toLocaleString("en-US", { weekday: "long" });
      setCurrentDay(day);

      const currentMins = now.getHours() * 60 + now.getMinutes();

      const schedule = timetableData.schedule?.[day]?.classes || [];
      const common = timetableData.commonRoutine || [];

      // 🔥 ROBUST MERGE + SORT
      const merged = [
        ...schedule,
        ...common.map(item => ({
          ...item,
          isCommonRoutine: true
        }))
      ].sort((a, b) => {
        const aT = parseTime(a.time?.split(" TO ")[0] || "");
        const bT = parseTime(b.time?.split(" TO ")[0] || "");
        return (aT || 0) - (bT || 0);
      });

      // 🔥 SAFE SLOT MATCH
      const active = merged.find(item => {
        if (!item?.time || !item.time.includes(" TO ")) return false;

        const [start, end] = item.time.split(" TO ");
        const s = parseTime(start?.trim());
        const e = parseTime(end?.trim());

        return s !== null && e !== null && currentMins >= s && currentMins < e;
      });

      setCurrentSlot(active || null);

      // 🔊 BELL
      const slotKey = active?.time || "";
      if (slotKey && lastPlayedSlot.current !== slotKey) {
        lastPlayedSlot.current = slotKey;

        if (bellRef.current) {
          bellRef.current.currentTime = 0;
          bellRef.current.play().catch(() => {});
        }
      }

      const idx = merged.findIndex(i => i === active);
      setNextSlot(merged[idx + 1] || null);
    };

    updateSlot();
    const interval = setInterval(updateSlot, 60000);
    return () => clearInterval(interval);
  }, [timetableData]);

  // ✅ CLOCK
  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ✅ SCREENSAVER
  useEffect(() => {
    let timer;
    const reset = () => {
      setIsIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIsIdle(true), 10000);
    };

    window.addEventListener("mousemove", reset);
    window.addEventListener("touchstart", reset);
    reset();

    return () => {
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("touchstart", reset);
    };
  }, []);

  // ✅ TEACHER LIST (SUPER SAFE)
  const teacherList = useMemo(() => {
    if (!timetableData || !currentDay) return [];

    const today = timetableData.schedule?.[currentDay]?.classes || [];

    let teachers = [];

    today.forEach(slot => {
      if (!slot?.subjects) return;

      Object.values(slot.subjects).forEach(school => {
        if (!school) return;

        Object.values(school).forEach(entry => {
          if (entry?.teacher) {
            teachers.push(...entry.teacher.split("/"));
          }
        });
      });
    });

    return [...new Set(teachers.map(t => t.trim()).filter(Boolean))];
  }, [timetableData, currentDay]);

  // ✅ TEACHER ROUTINE (ACCURATE MATCH)
  useEffect(() => {
    if (!selectedTeacher || !timetableData) return;

    const today = timetableData.schedule?.[currentDay]?.classes || [];

    const result = today.flatMap(slot => {
      if (!slot?.subjects) return [];

      return classes.flatMap(c => {
        let arr = [];

        const vh = slot.subjects?.["Vincent Hill"]?.[c];
        const sh = slot.subjects?.["Shangri-la"]?.[c];

        if (vh?.teacher?.split("/").map(t=>t.trim()).includes(selectedTeacher)) {
          arr.push({ time: slot.time, class: `${c} VH`, subject: vh.subject || "-" });
        }

        if (sh?.teacher?.split("/").map(t=>t.trim()).includes(selectedTeacher)) {
          arr.push({ time: slot.time, class: `${c} SH`, subject: sh.subject || "-" });
        }

        return arr;
      });
    });

    setTeacherSchedule(result);
  }, [selectedTeacher, timetableData, currentDay]);

  return (
    <div className={`timetable-container ${isIdle ? "screensaver" : ""}`}>

      {/* 🔊 BELL */}
      <audio ref={bellRef} src="/sounds/bell.mp3" preload="auto" />

      <h1>📅 School Timetable</h1>
      <h2>{currentDay} | {currentTime}</h2>

      {currentSlot && <h3>📚 {currentSlot.time}</h3>}
      {nextSlot && <h4>⏭ Next: {nextSlot.time}</h4>}

      {/* ✅ TABLE */}
      {currentSlot ? (
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

              // 🔥 HANDLE ALL NON-SUBJECT SLOTS
              if (currentSlot.break || currentSlot.remedial || currentSlot.isCommonRoutine) {
                const text =
                  currentSlot.break ||
                  currentSlot.remedial ||
                  currentSlot.activity ||
                  "Common Routine";

                return i === 0 ? (
                  <tr key={i}>
                    <td colSpan={3}>{text}</td>
                  </tr>
                ) : null;
              }

              // 🔥 SAFE SUBJECT HANDLING
              const vh = currentSlot.subjects?.["Vincent Hill"]?.[c] || {};
              const sh = currentSlot.subjects?.["Shangri-la"]?.[c] || {};

              return (
                <tr key={i}>
                  <td>{c}</td>
                  <td>{vh.subject ? `${vh.subject} (${vh.teacher || ""})` : "-"}</td>
                  <td>{sh.subject ? `${sh.subject} (${sh.teacher || ""})` : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : <p>No active slot</p>}

      {/* 👨‍🏫 TEACHER */}
      {!isIdle && (
        <>
          <h3>Select Teacher</h3>
          <select value={selectedTeacher} onChange={(e)=>setSelectedTeacher(e.target.value)}>
            <option value="">Select Teacher</option>
            {teacherList.map(t => <option key={t}>{t}</option>)}
          </select>

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
        </>
      )}

    </div>
  );
};

export default TimetableTable;
